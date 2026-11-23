# All of Us aggregates for the 11-19 agent tutorial. Runs INSIDE the Researcher Workbench only.
# Prints aggregates; any count below 20 is suppressed. Per-person frames stay in the kernel and are never printed.
# BQ stands for a backtick (the script is pasted through a JS template literal).
import os, json, numpy as np, pandas as pd
from google.cloud import bigquery
CDR = os.environ['WORKSPACE_CDR']; bq = bigquery.Client(); CAP = 400 * 10**9; GB = {}
def q(sql, tag, params=None):
    cfg = bigquery.QueryJobConfig(maximum_bytes_billed=CAP, query_parameters=params or [])
    job = bq.query(sql.replace('{CDR}', CDR).replace('BQ', chr(96)), job_config=cfg)
    df = job.result().to_dataframe(); GB[tag] = round((job.total_bytes_billed or 0) / 1e9, 2); return df
def s(n):
    n = int(n); return str(n) if (n >= 20 or n == 0) else '<20'
def pct(k, n): return ('%.1f%%' % (100.0 * k / n)) if (k >= 20 and n >= 20) else 'suppressed'
def evp(ev):
    return [bigquery.ArrayQueryParameter('ids', 'INT64', [int(x) for x in ev.person_id]),
            bigquery.ArrayQueryParameter('d0s', 'DATE', [pd.Timestamp(x).date() for x in ev.d0])]
COH = "coh AS (SELECT person_id, d0 FROM UNNEST(@ids) person_id WITH OFFSET o JOIN UNNEST(@d0s) d0 WITH OFFSET o2 ON o=o2)"

# 1. First-ever beta-blocker record (ATC C07) among people with Fitbit sleep data, plus first drug record of any kind.
Q_EV = """WITH atc AS (SELECT concept_id FROM BQ{CDR}.conceptBQ WHERE vocabulary_id='ATC' AND concept_code='C07'),
bbc AS (SELECT DISTINCT ca.descendant_concept_id cid FROM BQ{CDR}.concept_ancestorBQ ca JOIN atc ON ca.ancestor_concept_id=atc.concept_id),
slp AS (SELECT DISTINCT person_id FROM BQ{CDR}.sleep_daily_summaryBQ),
dr AS (SELECT d.person_id, MIN(d.drug_exposure_start_date) first_any, MIN(IF(bbc.cid IS NOT NULL, d.drug_exposure_start_date, NULL)) d0
  FROM BQ{CDR}.drug_exposureBQ d JOIN slp USING(person_id) LEFT JOIN bbc ON d.drug_concept_id=bbc.cid GROUP BY 1)
SELECT person_id, d0, first_any FROM dr WHERE d0 IS NOT NULL"""

# 2. Main-sleep nights from 21 days before to 6 days after each person's day 0 (one row per person-night).
Q_N = "WITH " + COH + """
SELECT s.person_id, DATE_DIFF(s.sleep_date, coh.d0, DAY) rel, s.minute_asleep asleep, s.minute_in_bed in_bed, s.minute_awake awake
FROM BQ{CDR}.sleep_daily_summaryBQ s JOIN coh USING(person_id)
WHERE s.is_main_sleep='true' AND s.minute_asleep BETWEEN 1 AND 1000
  AND s.sleep_date BETWEEN DATE_SUB(coh.d0, INTERVAL 21 DAY) AND DATE_ADD(coh.d0, INTERVAL 6 DAY)
QUALIFY ROW_NUMBER() OVER (PARTITION BY s.person_id, s.sleep_date ORDER BY s.minute_asleep DESC)=1"""
Q_A = "WITH " + COH + """
SELECT a.person_id, DATE_DIFF(a.date, coh.d0, DAY) rel, a.steps
FROM BQ{CDR}.activity_summaryBQ a JOIN coh USING(person_id)
WHERE a.steps BETWEEN 1 AND 100000 AND a.date BETWEEN DATE_SUB(coh.d0, INTERVAL 21 DAY) AND DATE_ADD(coh.d0, INTERVAL 6 DAY)
QUALIFY ROW_NUMBER() OVER (PARTITION BY a.person_id, a.date ORDER BY a.steps DESC)=1"""

# 3. Any 4 weeks: day 0 = one recorded night per person, chosen by a hash.
Q_RND = """WITH ev AS (SELECT person_id, ARRAY_AGG(sleep_date ORDER BY FARM_FINGERPRINT(CONCAT(CAST(person_id AS STRING), '-', CAST(sleep_date AS STRING))) LIMIT 1)[OFFSET(0)] d0
  FROM BQ{CDR}.sleep_daily_summaryBQ WHERE is_main_sleep='true' AND minute_asleep BETWEEN 1 AND 1000 GROUP BY 1)
SELECT s.person_id, ev.d0, DATE_DIFF(s.sleep_date, ev.d0, DAY) rel, s.minute_asleep asleep, s.minute_in_bed in_bed, s.minute_awake awake
FROM BQ{CDR}.sleep_daily_summaryBQ s JOIN ev USING(person_id)
WHERE s.is_main_sleep='true' AND s.minute_asleep BETWEEN 1 AND 1000
  AND s.sleep_date BETWEEN DATE_SUB(ev.d0, INTERVAL 21 DAY) AND DATE_ADD(ev.d0, INTERVAL 6 DAY)
QUALIFY ROW_NUMBER() OVER (PARTITION BY s.person_id, s.sleep_date ORDER BY s.minute_asleep DESC)=1"""
Q_P = """SELECT p.person_id, EXTRACT(YEAR FROM p.birth_datetime) byear, c.concept_name sex FROM BQ{CDR}.personBQ p
LEFT JOIN BQ{CDR}.conceptBQ c ON c.concept_id=p.sex_at_birth_concept_id WHERE p.person_id IN (SELECT DISTINCT person_id FROM BQ{CDR}.sleep_daily_summaryBQ)"""

def metrics(n):
    b = n[n.rel < 0].groupby('person_id').agg(nb=('asleep', 'size'), b_asleep=('asleep', 'mean'), b_bed=('in_bed', 'mean'), b_awake=('awake', 'mean'))
    r = n[n.rel >= 0].groupby('person_id').agg(nr=('asleep', 'size'), r_asleep=('asleep', 'mean'), r_bed=('in_bed', 'mean'), r_awake=('awake', 'mean'))
    m = b.join(r, how='inner'); m = m[(m.nb >= 14) & (m.nr >= 5)].copy(); m['chg'] = m.r_asleep / m.b_asleep - 1; return m
def dist(m, name):
    qs = [round(100 * float(x), 1) for x in m.chg.quantile([.05, .1, .25, .5, .75, .9, .95])]
    lo, hi, n = int((m.chg <= -0.10).sum()), int((m.chg >= 0.10).sum()), len(m)
    return '%s | n=%s | change%% p5/p10/p25/p50/p75/p90/p95=%s | drop>=10%%: %s | rise>=10%%: %s | baseline asleep median=%.0f min, awake median=%.0f, in bed median=%.0f' % (
        name, s(n), qs, pct(lo, n), pct(hi, n), m.b_asleep.median(), m.b_awake.median(), m.b_bed.median())
def series(n, ids, cols=('asleep', 'in_bed', 'awake')):
    g = n[n.person_id.isin(ids)]; rows = []
    for rel in range(-21, 7):
        d = g[g.rel == rel]
        if len(d) < 20: rows.append({'rel': rel, 'n': '<20'}); continue
        row = {'rel': rel, 'n': len(d)}
        for c in cols:
            row[c] = [int(round(float(x))) for x in d[c].quantile([.25, .5, .75])]
        rows.append(row)
    return rows

from textwrap import dedent
CATS = [('Hypertension', r'^I1[0-6]'), ('Type 2 diabetes', r'^E11'), ('Hyperlipidemia', r'^E78\.[0-5]'), ('Obesity', r'^E66'), ('Chronic kidney disease', r'^N18'),
 ('Obstructive sleep apnea', r'^G47\.33'), ('Insomnia', r'^(G47\.0|F51\.0)'), ('Depression', r'^F3[23]'), ('Anxiety', r'^F41'), ('Osteoarthritis', r'^M1[5-9]'),
 ('COPD', r'^J44'), ('Atrial fibrillation or flutter', r'^I48'), ('Heart failure', r'^I50'), ('Acute myocardial infarction', r'^I21'),
 ('Ischemic stroke', r'^I63'), ('Coronary atherosclerosis', r'^I25\.1')]
CASE = ' '.join(["WHEN REGEXP_CONTAINS(c.concept_code, r'%s') THEN '%s'" % (p, n) for n, p in CATS])
Q_C = "WITH src AS (SELECT c.concept_id, CASE " + CASE + """ END grp FROM BQ{CDR}.conceptBQ c WHERE c.vocabulary_id='ICD10CM'),
srcg AS (SELECT * FROM src WHERE grp IS NOT NULL),
std AS (SELECT DISTINCT srcg.grp, cr.concept_id_2 concept_id FROM srcg JOIN BQ{CDR}.concept_relationshipBQ cr ON cr.concept_id_1=srcg.concept_id AND cr.relationship_id='Maps to'),
""" + COH + """,
lab AS (SELECT co.person_id, srcg.grp FROM BQ{CDR}.condition_occurrenceBQ co JOIN coh USING(person_id) JOIN srcg ON co.condition_source_concept_id=srcg.concept_id WHERE co.condition_start_date<=coh.d0
  UNION DISTINCT SELECT co.person_id, std.grp FROM BQ{CDR}.condition_occurrenceBQ co JOIN coh USING(person_id) JOIN std ON co.condition_concept_id=std.concept_id WHERE co.condition_start_date<=coh.d0)
SELECT grp, COUNT(DISTINCT person_id) n FROM lab GROUP BY 1"""
MEDS = {'A10A': 'insulin', 'A10BA': 'metformin', 'A10BJ': 'GLP-1 receptor agonist', 'A10BK': 'SGLT2 inhibitor', 'C08': 'calcium channel blocker', 'C03': 'diuretic',
        'C09': 'ACE inhibitor or ARB', 'C10AA': 'statin', 'B01AC': 'antiplatelet', 'B01AA': 'warfarin', 'B01AF': 'direct oral anticoagulant', 'N06A': 'antidepressant',
        'N05C': 'hypnotic or sedative', 'N02A': 'opioid'}
Q_M = "WITH " + COH + """,
atc AS (SELECT concept_id, concept_code FROM BQ{CDR}.conceptBQ WHERE vocabulary_id='ATC' AND concept_code IN UNNEST(@codes)),
dm AS (SELECT DISTINCT d.person_id, atc.concept_code code FROM BQ{CDR}.drug_exposureBQ d JOIN coh USING(person_id)
  JOIN BQ{CDR}.concept_ancestorBQ ca ON d.drug_concept_id=ca.descendant_concept_id JOIN atc ON ca.ancestor_concept_id=atc.concept_id
  WHERE d.drug_exposure_start_date BETWEEN DATE_SUB(coh.d0, INTERVAL 365 DAY) AND DATE_SUB(coh.d0, INTERVAL 1 DAY))
SELECT code, COUNT(DISTINCT person_id) n FROM dm GROUP BY 1"""
# The beta-blocker ingredient recorded on day 0.
Q_I = "WITH " + COH + """,
atc AS (SELECT concept_id FROM BQ{CDR}.conceptBQ WHERE vocabulary_id='ATC' AND concept_code='C07'),
bbc AS (SELECT DISTINCT ca.descendant_concept_id cid FROM BQ{CDR}.concept_ancestorBQ ca JOIN atc ON ca.ancestor_concept_id=atc.concept_id),
ing AS (SELECT DISTINCT d.person_id, i.concept_name ingredient FROM BQ{CDR}.drug_exposureBQ d JOIN coh USING(person_id) JOIN bbc ON d.drug_concept_id=bbc.cid
  JOIN BQ{CDR}.concept_ancestorBQ ca ON ca.descendant_concept_id=d.drug_concept_id JOIN BQ{CDR}.conceptBQ i ON i.concept_id=ca.ancestor_concept_id AND i.concept_class_id='Ingredient'
  WHERE d.drug_exposure_start_date=coh.d0)
SELECT ingredient, COUNT(DISTINCT person_id) n FROM ing GROUP BY 1"""
Q_L = "WITH " + COH + """,
mc AS (SELECT concept_id, CASE WHEN concept_id=3004249 THEN 'systolic blood pressure' WHEN concept_id=3012888 THEN 'diastolic blood pressure'
  WHEN concept_id=3038553 THEN 'body mass index' WHEN concept_id=3027018 THEN 'heart rate' END lab FROM BQ{CDR}.conceptBQ WHERE concept_id IN (3004249, 3012888, 3038553, 3027018)),
ml AS (SELECT coh.person_id, mc.lab, ARRAY_AGG(m.value_as_number ORDER BY m.measurement_date DESC LIMIT 1)[OFFSET(0)] v
  FROM coh JOIN BQ{CDR}.measurementBQ m USING(person_id) JOIN mc ON m.measurement_concept_id=mc.concept_id
  WHERE m.value_as_number IS NOT NULL AND m.measurement_date BETWEEN DATE_SUB(coh.d0, INTERVAL 730 DAY) AND coh.d0 GROUP BY 1,2)
SELECT lab, COUNT(*) n, APPROX_QUANTILES(v, 4)[OFFSET(2)] median FROM ml GROUP BY 1"""
def profile(ev, name):
    n = len(ev); o = ['PROFILE %s n=%s' % (name, s(n))]
    if n < 20: return o
    P = PERS[PERS.person_id.isin(ev.person_id)].merge(ev[['person_id', 'd0']], on='person_id')
    age = pd.to_datetime(P.d0).dt.year - P.byear
    o.append('age median [IQR] %.0f [%.0f, %.0f]' % tuple(age.quantile([.5, .25, .75])))
    o.append('sex: ' + '; '.join('%s %s' % (k, pct(v, n)) for k, v in P.sex.value_counts().items()))
    par = evp(ev)
    c = q(Q_C, 'cond_' + name, par); o.append('conditions before day 0: ' + '; '.join('%s %s' % (r.grp, pct(r.n, n)) for r in c.sort_values('n', ascending=False).itertuples()))
    m = q(Q_M, 'med_' + name, par + [bigquery.ArrayQueryParameter('codes', 'STRING', list(MEDS))])
    o.append('medication classes in the 365 d before day 0: ' + '; '.join('%s %s' % (MEDS[r.code], pct(r.n, n)) for r in m.sort_values('n', ascending=False).itertuples()))
    i = q(Q_I, 'ing_' + name, par); o.append('beta blocker on day 0: ' + '; '.join('%s %s' % (r.ingredient, pct(r.n, n)) for r in i.sort_values('n', ascending=False).itertuples()))
    l = q(Q_L, 'lab_' + name, par); o.append('latest value within 2 y, median: ' + '; '.join('%s %s (n=%s)' % (r.lab, ('%.1f' % r.median) if r.n >= 20 else 'suppressed', s(r.n)) for r in l.itertuples()))
    return o

# Visits around day 0 (added while running): inpatient or emergency visit in the 14 days up to day 0.
Q_V = "WITH " + COH + """
SELECT COUNT(DISTINCT IF(v.visit_concept_id IN (9201, 9203, 262), coh.person_id, NULL)) n_inpatient_or_er_14d,
       COUNT(DISTINCT coh.person_id) n_any_visit_14d
FROM coh JOIN BQ{CDR}.visit_occurrenceBQ v USING(person_id)
WHERE v.visit_start_date BETWEEN DATE_SUB(coh.d0, INTERVAL 14 DAY) AND coh.d0"""

# ---- The run of 2026-11-16 (each step printed aggregates only) ----
# os.environ['WORKSPACE_CDR'] = '<your-workspace-project>.C2025Q4R6'   # the env var was not set in the new app image
# EV = q(Q_EV, 'ev'); S = EV[(EV.d0 - EV.first_any).dt.days >= 180]          # new starts: 11,738 of 14,075
# PERS = q(Q_P, 'pers'); N1 = q(Q_N, 'nights_start', evp(S)); M1 = metrics(N1)   # A: n 1,267
# S91 = S with d0 - 91 days; N0 = q(Q_N, 'nights_ctrl', evp(S91)); M0 = metrics(N0)   # B: n 1,389
# R = q(Q_RND, 'rnd'); MR = metrics(R)                                        # C: n 35,470
# ALL = M1.index; DROP = M1[M1.chg <= -0.10].index                            # composite: n 273
# series(N1, DROP), series(N1, ALL); steps with Q_A; profile(...) for DROP and ALL; Q_V for DROP, ALL and S91.
# Reference percentiles by age band and sex from MR joined to PERS. Total billed: 105.2 GB.
