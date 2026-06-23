'use strict';

// ---------------------------------------------------------------------------
// Challenge catalog.
//
// Each entry maps a FLAG (the string you obtain by exploiting the flaw) to a
// neutral description of the access-control weakness. Descriptions are written
// domain-agnostically: the concrete object name (order / statement / medical
// record) depends on the active domain — see domains/*.js for the mapping.
//
// `category` follows the OWASP A01:2021 (Broken Access Control) + PortSwigger
// "Access control" taxonomy. `hint` only names the *class* of bug, never the
// exploitation steps (full walkthrough lives in SOLUTIONS.md).
//
// *Pt fields hold the Portuguese copy; the UI picks EN/PT per the language
// toggle. The flag and category taxonomy keywords are intentionally kept.
// ---------------------------------------------------------------------------

const CHALLENGES = [
  {
    id: 'C01',
    flag: 'MW{idor_invoice_sequence_predictable}',
    title: 'Read another tenant\'s billing record',
    titlePt: 'Ler o registro de cobrança de outro tenant',
    category: 'IDOR / horizontal — predictable sequential identifier',
    categoryPt: 'IDOR / horizontal — identificador sequencial previsível',
    difficulty: 1,
    hint: 'The reference numbers your own records use are not as random as they look.',
    hintPt: 'Os números de referência dos seus próprios registros não são tão aleatórios quanto parecem.',
  },
  {
    id: 'C02',
    flag: 'MW{idor_chained_uuid_leak_profile}',
    title: 'Pull a foreign user\'s private profile (PII)',
    titlePt: 'Puxar o perfil privado de outro usuário (PII)',
    category: 'IDOR / horizontal — chained: leak an opaque id, then dereference it',
    categoryPt: 'IDOR / horizontal — encadeado: vaze um id opaco e depois desreferencie',
    difficulty: 2,
    hint: 'A random UUID is only "unguessable" until the app hands it to you somewhere else.',
    hintPt: 'Um UUID aleatório só é "impossível de adivinhar" até o app te entregar ele em outro lugar.',
  },
  {
    id: 'C03',
    flag: 'MW{idor_base64_document_token}',
    title: 'Open a document you were never shared',
    titlePt: 'Abrir um documento que nunca foi compartilhado com você',
    category: 'IDOR / horizontal — opaque-looking but reversible token',
    categoryPt: 'IDOR / horizontal — token de aparência opaca, mas reversível',
    difficulty: 2,
    hint: 'Opaque is not the same as unpredictable. Decode before you assume.',
    hintPt: 'Opaco não é o mesmo que imprevisível. Decodifique antes de assumir.',
  },
  {
    id: 'C04',
    flag: 'MW{path_traversal_arbitrary_file_read}',
    title: 'Read a file outside the upload area',
    titlePt: 'Ler um arquivo fora da área de upload',
    category: 'IDOR / path traversal — direct object reference to the filesystem',
    categoryPt: 'IDOR / path traversal — referência direta a objeto no sistema de arquivos',
    difficulty: 2,
    hint: 'The download endpoint trusts the name it is given.',
    hintPt: 'O endpoint de download confia no nome que recebe.',
  },
  {
    id: 'C05',
    flag: 'MW{graphql_missing_object_authorization}',
    title: 'Exfiltrate PII through the data API',
    titlePt: 'Exfiltrar PII pela API de dados',
    category: 'BOLA — missing object-level authz on a GraphQL resolver',
    categoryPt: 'BOLA — falta de autorização a nível de objeto num resolver GraphQL',
    difficulty: 2,
    hint: 'The REST UI is not the only door into the same objects.',
    hintPt: 'A UI REST não é a única porta para os mesmos objetos.',
  },
  {
    id: 'C06',
    flag: 'MW{write_idor_cross_tenant_modify}',
    title: 'Modify a record that is not yours',
    titlePt: 'Modificar um registro que não é seu',
    category: 'IDOR / horizontal — state-changing (write) with no ownership check',
    categoryPt: 'IDOR / horizontal — escrita (state-changing) sem verificação de dono',
    difficulty: 2,
    hint: 'Reading is not the only thing the object endpoints let you do.',
    hintPt: 'Ler não é a única coisa que os endpoints de objeto deixam você fazer.',
  },
  {
    id: 'C07',
    flag: 'MW{second_order_idor_export_job}',
    title: 'Retrieve someone else\'s data export',
    titlePt: 'Recuperar a exportação de dados de outra pessoa',
    category: 'IDOR / second-order — authz decided at submit, trusted at fetch',
    categoryPt: 'IDOR / segunda ordem — autorização decidida no envio, confiada na busca',
    difficulty: 3,
    hint: 'The id you submit early is trusted later, without re-checking.',
    hintPt: 'O id que você envia no início é confiado depois, sem ser reverificado.',
  },
  {
    id: 'C08',
    flag: 'MW{mass_assignment_role_escalation}',
    title: 'Promote your own account',
    titlePt: 'Promover a sua própria conta',
    category: 'Vertical — mass assignment / over-posting on a profile update',
    categoryPt: 'Vertical — mass assignment / over-posting na atualização de perfil',
    difficulty: 2,
    hint: 'The settings form sends fewer fields than the endpoint will accept.',
    hintPt: 'O formulário de configurações envia menos campos do que o endpoint aceita.',
  },
  {
    id: 'C09',
    flag: 'MW{bfla_missing_authz_audit_logs}',
    title: 'Read the admin audit log as a normal user',
    titlePt: 'Ler o log de auditoria de admin como usuário comum',
    category: 'BFLA — missing function-level authorization',
    categoryPt: 'BFLA — falta de autorização a nível de função',
    difficulty: 1,
    hint: 'Some admin endpoints forgot they were admin endpoints.',
    hintPt: 'Alguns endpoints de admin esqueceram que eram endpoints de admin.',
  },
  {
    id: 'C10',
    flag: 'MW{bfla_http_method_bypass}',
    title: 'Perform an admin action the UI hides from you',
    titlePt: 'Executar uma ação de admin que a UI esconde de você',
    category: 'BFLA — authorization enforced on one HTTP method but not another',
    categoryPt: 'BFLA — autorização aplicada em um método HTTP, mas não em outro',
    difficulty: 3,
    hint: 'Listing the resource is guarded. Is everything else?',
    hintPt: 'Listar o recurso é protegido. E o resto?',
  },
  {
    id: 'C11',
    flag: 'MW{trusting_unsigned_client_cookie}',
    title: 'Reach the staff back-office',
    titlePt: 'Alcançar o back-office da equipe',
    category: 'Vertical — trusting an unsigned, client-controlled cookie',
    categoryPt: 'Vertical — confiar num cookie sem assinatura, controlado pelo cliente',
    difficulty: 2,
    hint: 'Not every cookie the server sets is signed. Look at what you are allowed to edit.',
    hintPt: 'Nem todo cookie que o servidor define é assinado. Veja o que você tem permissão de editar.',
  },
  {
    id: 'C12',
    flag: 'MW{jwt_alg_none_signature_bypass}',
    title: 'Forge a privileged token for the legacy API',
    titlePt: 'Forjar um token privilegiado para a API legada',
    category: 'Vertical — JWT signature bypass (alg:none) on a legacy endpoint',
    categoryPt: 'Vertical — bypass de assinatura JWT (alg:none) num endpoint legado',
    difficulty: 3,
    hint: 'A token is only as trustworthy as the algorithm the server is willing to accept.',
    hintPt: 'Um token só é tão confiável quanto o algoritmo que o servidor aceita.',
  },
  {
    id: 'C13',
    flag: 'MW{header_xoriginalurl_gateway_bypass}',
    title: 'Reach a path the gateway blocks',
    titlePt: 'Alcançar um caminho que o gateway bloqueia',
    category: 'Platform misconfig — front-end path filter bypassed via request header',
    categoryPt: 'Má configuração de plataforma — filtro de caminho do front-end driblado por header',
    difficulty: 3,
    hint: 'The block happens at the edge. The back-end is more trusting about which URL it is serving.',
    hintPt: 'O bloqueio acontece na borda. O back-end é mais confiante sobre qual URL está servindo.',
  },
  {
    id: 'C14',
    flag: 'MW{referer_based_access_control}',
    title: 'Trip an admin setting without being admin',
    titlePt: 'Acionar uma configuração de admin sem ser admin',
    category: 'Broken logic — access decision based on the Referer header',
    categoryPt: 'Lógica quebrada — decisão de acesso baseada no header Referer',
    difficulty: 2,
    hint: 'One privileged action checks where you say you came from.',
    hintPt: 'Uma ação privilegiada confia em de onde você diz que veio.',
  },
  {
    id: 'C15',
    flag: 'MW{multistep_process_authz_bypass}',
    title: 'Finish a privileged workflow you can\'t start',
    titlePt: 'Concluir um fluxo privilegiado que você não pode iniciar',
    category: 'Broken logic — multi-step process only authorizes the first step',
    categoryPt: 'Lógica quebrada — processo de múltiplas etapas só autoriza a primeira',
    difficulty: 3,
    hint: 'The guard is on the door, not on the room behind it.',
    hintPt: 'A guarda está na porta, não na sala atrás dela.',
  },
];

const FLAG_TO_CHALLENGE = Object.fromEntries(CHALLENGES.map((c) => [c.flag, c]));

module.exports = { CHALLENGES, FLAG_TO_CHALLENGE };
