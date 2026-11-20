import type { Lang } from './types'
import type { Op } from './ops'

const en = {
  langName: 'English',
  tag: '// Lab — AI tool',
  title: 'AI Excel data processor',
  subtitle: 'Upload any spreadsheet and describe what you need in plain language. The AI writes a step-by-step plan, your browser runs it, and every step comes with the matching Excel formula.',
  demoNote: 'Try it with the sample file: synthetic utility billing data with a few deliberate data-quality issues.',
  privacy: 'Your file is read in your browser. Only column names and a few sample values are sent to the AI, never the full data.',
  how1Title: 'AI plans',
  how1: 'Your request becomes a list of named steps, such as clean, look up, group, or reconcile.',
  how2Title: 'Browser calculates',
  how2: 'Every number is computed deterministically on your device, so results are exact and repeatable.',
  how3Title: 'Excel stays in the loop',
  how3: 'Each step shows its Excel formula, and the download keeps live formulas you can audit.',

  uploadTitle: 'Your data',
  dropHint: 'Drop an .xlsx or .csv file here, or',
  chooseFile: 'choose a file',
  useSample: 'Use sample file',
  downloadSample: 'Download sample',
  loading: 'Reading file…',
  errNotXlsx: 'That file could not be read. Upload an .xlsx or .csv file.',
  errTooBig: 'That file is larger than 10 MB. Try a smaller extract.',
  errTooManyRows: 'That sheet has more than 50,000 rows. Try a smaller extract.',
  errEmpty: 'No data was found in that file.',
  startSheet: 'Start from sheet',
  rowsCols: '{rows} rows · {cols} columns',

  requestLabel: 'What should happen to the data?',
  requestPlaceholder: 'Total billed amount by month and rate class, then compare it with Finance_GL',
  run: 'Run',
  running: 'Planning…',
  suggestions: 'Try one of these',
  suggest: [
    'Clean the data: trim spaces, make Customer_ID C + 6 digits, change res and Residential to RES, remove duplicates',
    'Show the rows where kWh is missing',
    'Calculate the expected bill from the Tariff sheet and flag rows where the billed amount differs by more than 0.5%',
    'Total the billed amount by month and rate class, then reconcile it with Finance_GL',
  ],

  stepsTitle: 'Steps',
  noSteps: 'No steps yet. Describe what you need above and select Run.',
  requestN: 'Request {n}',
  rowsChange: '{before} → {after} rows',
  affected: '{n} changed',
  removed: '{n} removed',
  issues: '{n} to review',
  stepFailed: 'This step could not run: {error}',
  stepSkipped: 'Skipped because an earlier step failed',
  excelFormula: 'Excel formula',
  copy: 'Copy',
  copied: 'Copied',
  undo: 'Undo last request',
  reset: 'Start over',
  unsupported: 'Not supported yet',

  resultTitle: 'Result',
  showing: 'Showing {shown} of {total} rows',
  download: 'Download .xlsx',
  downloadHint: 'Includes the result with live formulas, a Steps sheet, and your original sheets.',
  emptyResult: 'No rows match. Undo the last request or try a different filter.',

  askTitle: 'Ask about the result',
  askPlaceholder: 'Why does 2026-05 FARM not match?',
  ask: 'Ask',
  explain: 'Explain this result',
  explainPrompt: 'Explain this result in plain language: what it shows, anything that looks wrong, and what to check next.',
  thinking: 'Thinking…',
  you: 'You',
  ai: 'AI',

  errNotConfigured: 'The AI is not connected on this site yet. You can still explore the sample file and steps.',
  errRateLimited: 'Too many requests. Try again in a few minutes.',
  errFailed: 'The AI could not answer right now. Try again.',
  errNoFile: 'Load a file first.',
  errEmptyRequest: 'Describe what you need first.',

  steps: {
    use_sheet: 'Start from sheet {sheet}',
    trim: 'Trim extra spaces in {columns}',
    change_case: 'Change {columns} to {case}',
    upper: 'upper case',
    lower: 'lower case',
    standardize_id: 'Standardize {column} as {prefix} + {digits} digits',
    replace_values: 'Replace values in {column}: {pairs}',
    fill_missing: 'Fill blank {column} with {value}',
    remove_duplicates: 'Remove duplicate rows',
    remove_duplicates_by: 'Remove duplicates by {columns}',
    filter: 'Keep rows where {where}',
    sort: 'Sort by {by}',
    asc: 'ascending',
    desc: 'descending',
    add_column: 'Add column {name} = {expression}',
    lookup: 'Look up {columns} from {sheet} by {column}',
    group_by: 'Group by {by}: {aggs}',
    reconcile: 'Reconcile {left} with {sheet}.{right} by {keys} (tolerance {tol}%)',
    select_columns: 'Keep columns {columns}',
    rename_column: 'Rename {from} to {to}',
    limit: 'Keep the first {rows} rows',
    agg: { sum: 'sum', average: 'average', count: 'count', min: 'min', max: 'max', count_distinct: 'distinct count' },
  },
}

export type Dict = typeof en

const ko: Dict = {
  langName: '한국어',
  tag: '// Lab — AI 도구',
  title: 'AI 엑셀 데이터 가공',
  subtitle: '어떤 스프레드시트든 올리고 필요한 작업을 평소 말로 요청하세요. AI가 단계별 계획을 세우면 브라우저가 실행하고, 단계마다 같은 작업을 하는 엑셀 수식을 함께 보여줘요.',
  demoNote: '샘플 파일로 먼저 해보세요. 데이터 품질 문제를 일부러 몇 개 넣어 둔 가상 전력 요금 청구 데이터예요.',
  privacy: '파일은 브라우저 안에서 읽어요. AI에는 열 이름과 샘플 값 몇 개만 보내고, 전체 데이터는 보내지 않아요.',
  how1Title: 'AI가 계획',
  how1: '요청을 정리, 조회, 그룹 합계, 대사 같은 이름 있는 단계 목록으로 바꿔요.',
  how2Title: '브라우저가 계산',
  how2: '모든 숫자는 내 기기에서 정해진 규칙대로 계산해서, 결과가 정확하고 똑같이 재현돼요.',
  how3Title: '엑셀과 연결',
  how3: '단계마다 엑셀 수식을 보여주고, 내려받은 파일에도 검증할 수 있는 수식이 그대로 남아요.',

  uploadTitle: '데이터',
  dropHint: '.xlsx 또는 .csv 파일을 여기에 끌어 놓거나',
  chooseFile: '파일 선택',
  useSample: '샘플 파일 사용',
  downloadSample: '샘플 내려받기',
  loading: '파일 읽는 중…',
  errNotXlsx: '파일을 읽을 수 없어요. .xlsx 또는 .csv 파일을 올려 주세요.',
  errTooBig: '파일이 10MB보다 커요. 더 작게 추출해서 올려 주세요.',
  errTooManyRows: '시트가 50,000행을 넘어요. 더 작게 추출해서 올려 주세요.',
  errEmpty: '파일에서 데이터를 찾지 못했어요.',
  startSheet: '시작 시트',
  rowsCols: '{rows}행 · {cols}열',

  requestLabel: '데이터를 어떻게 가공할까요?',
  requestPlaceholder: '월별·요금 유형별 청구액 합계를 내고 Finance_GL과 비교해 줘',
  run: '실행',
  running: '계획 세우는 중…',
  suggestions: '이런 요청을 해 보세요',
  suggest: [
    '데이터 정리: 공백 제거, Customer_ID를 C + 6자리로 통일, res와 Residential을 RES로 바꾸고 중복 행 제거',
    'kWh 값이 비어 있는 행만 보여줘',
    'Tariff 시트로 예상 청구액을 계산하고, 실제 청구액과 0.5% 넘게 차이 나는 행을 표시해 줘',
    '월별·요금 유형별 청구액 합계를 내고 Finance_GL과 대사해 줘',
  ],

  stepsTitle: '단계',
  noSteps: '아직 단계가 없어요. 위에 필요한 작업을 적고 실행을 눌러 주세요.',
  requestN: '요청 {n}',
  rowsChange: '{before} → {after}행',
  affected: '{n}개 변경',
  removed: '{n}개 제거',
  issues: '{n}개 확인 필요',
  stepFailed: '이 단계를 실행하지 못했어요: {error}',
  stepSkipped: '앞 단계가 실패해서 건너뛰었어요',
  excelFormula: '엑셀 수식',
  copy: '복사',
  copied: '복사됨',
  undo: '마지막 요청 취소',
  reset: '처음부터',
  unsupported: '아직 지원하지 않는 작업',

  resultTitle: '결과',
  showing: '전체 {total}행 중 {shown}행 표시',
  download: '.xlsx 내려받기',
  downloadHint: '수식이 살아 있는 결과 시트, 단계 시트, 원본 시트가 함께 들어 있어요.',
  emptyResult: '조건에 맞는 행이 없어요. 마지막 요청을 취소하거나 다른 조건으로 해 보세요.',

  askTitle: '결과에 대해 질문하기',
  askPlaceholder: '2026-05 FARM은 왜 금액이 안 맞아?',
  ask: '질문',
  explain: '결과 설명해 줘',
  explainPrompt: '이 결과를 쉬운 말로 설명해 줘. 무엇을 보여주는지, 이상해 보이는 부분, 다음에 확인할 것을 알려 줘.',
  thinking: '생각하는 중…',
  you: '나',
  ai: 'AI',

  errNotConfigured: '이 사이트에는 아직 AI가 연결되지 않았어요. 샘플 파일과 단계는 그대로 둘러볼 수 있어요.',
  errRateLimited: '요청이 너무 많아요. 몇 분 뒤에 다시 해 주세요.',
  errFailed: '지금은 AI가 답하지 못했어요. 다시 해 주세요.',
  errNoFile: '먼저 파일을 불러와 주세요.',
  errEmptyRequest: '먼저 필요한 작업을 적어 주세요.',

  steps: {
    use_sheet: '{sheet} 시트에서 시작',
    trim: '{columns}의 불필요한 공백 제거',
    change_case: '{columns}을(를) {case}로 변경',
    upper: '대문자',
    lower: '소문자',
    standardize_id: '{column}을(를) {prefix} + {digits}자리 형식으로 통일',
    replace_values: '{column} 값 바꾸기: {pairs}',
    fill_missing: '비어 있는 {column}을(를) {value}(으)로 채우기',
    remove_duplicates: '중복 행 제거',
    remove_duplicates_by: '{columns} 기준으로 중복 제거',
    filter: '{where} 조건에 맞는 행만 남기기',
    sort: '{by} 순으로 정렬',
    asc: '오름차순',
    desc: '내림차순',
    add_column: '{name} 열 추가 = {expression}',
    lookup: '{sheet} 시트에서 {column} 기준으로 {columns} 가져오기',
    group_by: '{by}별로 묶기: {aggs}',
    reconcile: '{keys} 기준으로 {left}과(와) {sheet}.{right} 대사 (허용 오차 {tol}%)',
    select_columns: '{columns} 열만 남기기',
    rename_column: '{from} 열 이름을 {to}(으)로 변경',
    limit: '처음 {rows}행만 남기기',
    agg: { sum: '합계', average: '평균', count: '개수', min: '최솟값', max: '최댓값', count_distinct: '고유 개수' },
  },
}

const fr: Dict = {
  langName: 'Français',
  tag: '// Lab — outil IA',
  title: 'Traitement de données Excel par IA',
  subtitle: 'Importez n’importe quel classeur et décrivez ce dont vous avez besoin en langage courant. L’IA rédige un plan étape par étape, votre navigateur l’exécute, et chaque étape est accompagnée de la formule Excel correspondante.',
  demoNote: 'Essayez avec le fichier exemple : des données de facturation d’électricité fictives, avec quelques problèmes de qualité ajoutés volontairement.',
  privacy: 'Votre fichier est lu dans votre navigateur. Seuls les noms de colonnes et quelques valeurs d’exemple sont envoyés à l’IA, jamais les données complètes.',
  how1Title: 'L’IA planifie',
  how1: 'Votre demande devient une liste d’étapes nommées : nettoyer, rechercher, regrouper ou rapprocher.',
  how2Title: 'Le navigateur calcule',
  how2: 'Chaque nombre est calculé de façon déterministe sur votre appareil : les résultats sont exacts et reproductibles.',
  how3Title: 'Excel reste au cœur',
  how3: 'Chaque étape affiche sa formule Excel, et le fichier téléchargé conserve des formules vérifiables.',

  uploadTitle: 'Vos données',
  dropHint: 'Déposez un fichier .xlsx ou .csv ici, ou',
  chooseFile: 'choisissez un fichier',
  useSample: 'Utiliser le fichier exemple',
  downloadSample: 'Télécharger l’exemple',
  loading: 'Lecture du fichier…',
  errNotXlsx: 'Ce fichier n’a pas pu être lu. Importez un fichier .xlsx ou .csv.',
  errTooBig: 'Ce fichier dépasse 10 Mo. Essayez un extrait plus petit.',
  errTooManyRows: 'Cette feuille dépasse 50 000 lignes. Essayez un extrait plus petit.',
  errEmpty: 'Aucune donnée n’a été trouvée dans ce fichier.',
  startSheet: 'Feuille de départ',
  rowsCols: '{rows} lignes · {cols} colonnes',

  requestLabel: 'Que faut-il faire avec les données ?',
  requestPlaceholder: 'Total facturé par mois et par catégorie tarifaire, puis comparaison avec Finance_GL',
  run: 'Exécuter',
  running: 'Planification…',
  suggestions: 'Essayez l’une de ces demandes',
  suggest: [
    'Nettoyer les données : supprimer les espaces, mettre Customer_ID au format C + 6 chiffres, remplacer res et Residential par RES, supprimer les doublons',
    'Afficher les lignes où kWh est vide',
    'Calculer la facture attendue à partir de la feuille Tariff et signaler les lignes dont le montant facturé diffère de plus de 0,5 %',
    'Totaliser le montant facturé par mois et par catégorie tarifaire, puis le rapprocher de Finance_GL',
  ],

  stepsTitle: 'Étapes',
  noSteps: 'Aucune étape pour l’instant. Décrivez votre besoin ci-dessus et sélectionnez Exécuter.',
  requestN: 'Demande {n}',
  rowsChange: '{before} → {after} lignes',
  affected: '{n} modifiées',
  removed: '{n} supprimées',
  issues: '{n} à vérifier',
  stepFailed: 'Cette étape n’a pas pu s’exécuter : {error}',
  stepSkipped: 'Ignorée, car une étape précédente a échoué',
  excelFormula: 'Formule Excel',
  copy: 'Copier',
  copied: 'Copiée',
  undo: 'Annuler la dernière demande',
  reset: 'Recommencer',
  unsupported: 'Pas encore pris en charge',

  resultTitle: 'Résultat',
  showing: '{shown} lignes affichées sur {total}',
  download: 'Télécharger le .xlsx',
  downloadHint: 'Contient le résultat avec des formules actives, une feuille Étapes et vos feuilles d’origine.',
  emptyResult: 'Aucune ligne ne correspond. Annulez la dernière demande ou essayez un autre filtre.',

  askTitle: 'Poser une question sur le résultat',
  askPlaceholder: 'Pourquoi 2026-05 FARM ne concorde-t-il pas ?',
  ask: 'Demander',
  explain: 'Expliquer ce résultat',
  explainPrompt: 'Explique ce résultat en termes simples : ce qu’il montre, ce qui semble anormal et ce qu’il faut vérifier ensuite.',
  thinking: 'Réflexion…',
  you: 'Vous',
  ai: 'IA',

  errNotConfigured: 'L’IA n’est pas encore connectée sur ce site. Vous pouvez quand même explorer le fichier exemple et les étapes.',
  errRateLimited: 'Trop de demandes. Réessayez dans quelques minutes.',
  errFailed: 'L’IA n’a pas pu répondre pour le moment. Réessayez.',
  errNoFile: 'Chargez d’abord un fichier.',
  errEmptyRequest: 'Décrivez d’abord votre besoin.',

  steps: {
    use_sheet: 'Partir de la feuille {sheet}',
    trim: 'Supprimer les espaces superflus dans {columns}',
    change_case: 'Mettre {columns} en {case}',
    upper: 'majuscules',
    lower: 'minuscules',
    standardize_id: 'Uniformiser {column} au format {prefix} + {digits} chiffres',
    replace_values: 'Remplacer des valeurs dans {column} : {pairs}',
    fill_missing: 'Remplir les {column} vides avec {value}',
    remove_duplicates: 'Supprimer les lignes en double',
    remove_duplicates_by: 'Supprimer les doublons selon {columns}',
    filter: 'Garder les lignes où {where}',
    sort: 'Trier par {by}',
    asc: 'croissant',
    desc: 'décroissant',
    add_column: 'Ajouter la colonne {name} = {expression}',
    lookup: 'Rechercher {columns} dans {sheet} selon {column}',
    group_by: 'Regrouper par {by} : {aggs}',
    reconcile: 'Rapprocher {left} de {sheet}.{right} selon {keys} (tolérance {tol} %)',
    select_columns: 'Garder les colonnes {columns}',
    rename_column: 'Renommer {from} en {to}',
    limit: 'Garder les {rows} premières lignes',
    agg: { sum: 'somme', average: 'moyenne', count: 'nombre', min: 'minimum', max: 'maximum', count_distinct: 'nombre distinct' },
  },
}

export const DICTS: Record<Lang, Dict> = { en, ko, fr }
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'FR' },
]
export const LOCALES: Record<Lang, string> = { en: 'en-CA', ko: 'ko-KR', fr: 'fr-CA' }

export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`))
}

const list = (xs: string[]) => xs.join(', ')

export function describeStep(op: Op, d: Dict): string {
  const s = d.steps
  switch (op.op) {
    case 'use_sheet': return fmt(s.use_sheet, { sheet: op.sheet })
    case 'trim': return fmt(s.trim, { columns: list(op.columns) })
    case 'change_case': return fmt(s.change_case, { columns: list(op.columns), case: op.case === 'upper' ? s.upper : s.lower })
    case 'standardize_id': return fmt(s.standardize_id, { column: op.column, prefix: op.prefix || '∅', digits: op.digits })
    case 'replace_values': return fmt(s.replace_values, { column: op.column, pairs: op.mapping.map((m) => `${m.from || '∅'} → ${m.to || '∅'}`).join(', ') })
    case 'fill_missing': return fmt(s.fill_missing, { column: op.column, value: String(op.value) })
    case 'remove_duplicates': return op.columns ? fmt(s.remove_duplicates_by, { columns: list(op.columns) }) : s.remove_duplicates
    case 'filter': return fmt(s.filter, { where: op.where })
    case 'sort': return fmt(s.sort, { by: op.by.map((b) => `${b.column} (${b.direction === 'desc' ? s.desc : s.asc})`).join(', ') })
    case 'add_column': return fmt(s.add_column, { name: op.name, expression: op.expression })
    case 'lookup': return fmt(s.lookup, { columns: list(op.columns), sheet: op.from_sheet, column: op.match_column })
    case 'group_by': return fmt(s.group_by, {
      by: list(op.by),
      aggs: op.aggregations.map((a) => `${s.agg[a.func]}${a.column ? `(${a.column})` : ''}`).join(', '),
    })
    case 'reconcile': return fmt(s.reconcile, {
      left: op.left_value, sheet: op.with_sheet, right: op.right_value,
      keys: op.keys.map((k) => (k.left === k.right ? k.left : `${k.left}=${k.right}`)).join(', '),
      tol: op.tolerance_pct ?? 0,
    })
    case 'select_columns': return fmt(s.select_columns, { columns: list(op.columns) })
    case 'rename_column': return fmt(s.rename_column, { from: op.from, to: op.to })
    case 'limit': return fmt(s.limit, { rows: op.rows })
  }
}
