# Extrator de questões e contrato Mentary

Esta atualização usa o README, a migration `20261016000000_banco_de_questoes.sql` e o `seed.sql` fornecidos como referência. Os arquivos SQL foram lidos, sem execução ou alteração das tabelas de referência. Todo o trabalho permanece local.

## Revisão

A tela mostra todas as questões extraídas em cartões, sem seletor de uma questão por vez. Cada cartão exibe enunciado, alternativas, gabarito e pendências. Os formulários completos ficam em “Ajustar detalhes”; o original abre sob demanda.

Ao entrar no extrator, a área de envio começa vazia. O último documento só é retomado pelo botão “Continuar revisão anterior”. A opção “Novo documento” permanece visível, limpa a seleção do arquivo e preserva as questões anteriores. O seletor de arquivo não fica escondido após a extração. Dois testes adicionais de regressão cobrem esse comportamento (25 testes no total).

Os dados comuns do documento são preenchidos uma vez e aplicados às questões pendentes. Por padrão, classificações individuais já informadas são preservadas; a substituição é uma opção explícita. É possível colar o gabarito em lote no formato `1-C, 2-A, 3-B`. Gabaritos explícitos no PDF e campos claramente rotulados no cabeçalho são aproveitados automaticamente, sem inventar respostas nem mapear BNCC por suposição.

A aprovação em lote exige uma confirmação de revisão e inclui somente as questões sem pendências. Itens incompletos permanecem na mesma lista, assim como os já aprovados. O botão “Salvar revisão” permite retomar o trabalho depois. A versão da matriz SAEB é informação complementar opcional, conforme o schema de referência; não cria uma etapa obrigatória adicional.

O extrator aceita PDFs com texto, imagens JPG/PNG/WEBP/AVIF, CSV, XLSX e JSON. A tela oferece modelos de CSV, XLSX e JSON. O XLSX lê as abas com questões, compartilha o cabeçalho do CSV e não executa fórmulas de planilha; arquivos com células de fórmula são rejeitados. Até 500 questões por arquivo estruturado, 30 páginas por PDF e 20 MB por documento; imagens ficam limitadas a 5 MB.

Os campos de revisão incluem:

- Enunciado e alternativas como texto ou HTML sanitizado, com prévia e fórmulas KaTeX em `span[data-latex]`.
- Tipo de questão `MULTIPLA ESCOLHA` ou `VERDADEIRO OU FALSO`; o segundo exige exatamente duas alternativas. O padrão de criação é quatro alternativas.
- Alternativas `TEXTO` ou `IMAGEM`; imagens locais ou URLs públicas HTTPS.
- Componente, ano/etapa, BNCC com vários códigos separados por vírgulas, descritor e versão da matriz SAEB, dificuldade, tema/conteúdo e tipo pedagógico.
- Dificuldades Fácil, Média, Difícil e Muito difícil; tipos pedagógicos Múltipla escolha, Associação, Lacunas e Interpretação de gráficos e tabelas.
- Justificativa opcional e identificador opcional de recurso de Realidade Aumentada.

A BNCC pode ser escolhida em uma seleção múltipla com busca por código ou conteúdo e filtro pela disciplina e ano. O catálogo local do extrator foi extraído da [BNCC do MEC](https://basenacionalcomum.mec.gov.br/images/BNCC_20dez_site.pdf) e cobre habilidades do Ensino Fundamental (1º ao 9º ano), incluindo blocos de anos. Cada registro guarda sua página de origem. Educação Infantil, Ensino Médio e o complemento de Computação não estão neste catálogo. Códigos importados fora dele são preservados; a validação de importações continua verificando o formato, sem afirmar alinhamento pedagógico. O professor deve escolher as habilidades adequadas ao conteúdo. Não existe associação automática entre BNCC e SAEB. A versão da matriz SAEB é guardada separadamente do payload de referência. As demais telas ainda usam os dados demonstrativos anteriores.

## Exportação

Após aprovar uma questão, a tela permite exportar essa questão ou todas as aprovadas do documento em JSON no formato `public.questions`:

- `question_id`: UUID estável do item local; facilita correlacionar a questão com a rastreabilidade.
- `title`: HTML sanitizado; imagens resolvidas por URL pública e fórmulas mantidas em `data-latex`.
- `answer_options`: lista ordenada de texto/HTML; `correct_answer_index` começa em zero.
- `question_type`, `answer_options_type`, `subjects` e os seis campos de `metadata` usados pelo construtor.
- `content_type: null` e `fk_content_id: null`, pois a mídia legada não é usada em simulados.
- `question_visibility_status: "PRIVATE"`, conforme o padrão da referência.
- `answers_explanation` e `ar_gallery_id` opcional. O peso `score` não é definido pelo extrator.

Autor e instituição usam, na demonstração, os identificadores do seed: Professor Exemplo (`00000000-0000-0000-0000-000000000001`) e Escola Exemplo (`00000000-0000-0000-0000-000000000010`). Na integração, esses vínculos devem vir da sessão validada pelo servidor. A existência e a permissão de uso de um recurso `ar_gallery` também devem ser verificadas no servidor.

O arquivo de rastreabilidade é exportado separadamente, com documento, página, versão da matriz, status, responsável, data UTC e histórico. Esses campos não são inseridos em `public.questions`. Reabrir uma questão invalida a aprovação e preserva o histórico.

## Imagens e armazenamento

Uploads de imagem são validados por formato, limite de 5 MB e decodificação no navegador. O binário fica no IndexedDB; os registros armazenam referências `local-media`, evitando colocar arquivos grandes no localStorage. As imagens continuam disponíveis depois de recarregar a página.

Uma questão com imagens locais pode ser revisada e aprovada na demonstração, mas sua exportação final é bloqueada enquanto houver referências locais. O servidor precisa enviar essas imagens ao bucket `media`, no caminho `questionImages/{institution_id}/{timestamp}_{nome-do-arquivo}`, e substituir as referências por URLs públicas. Também é possível informar uma URL HTTPS já disponível para conferir a conversão local.

Documentos originais permanecem separados das imagens das questões. Nenhum bucket Supabase foi criado nem recebeu uploads nesta entrega. A integração deverá manter documentos em armazenamento privado e implementar retenção/exclusão apropriadas.

## Dependências do servidor

OCR de imagens/PDFs digitalizados, extração de layouts complexos, catálogo oficial, autenticação, autorização, vínculo institucional, auditoria imutável, persistência centralizada e integração com o Banco continuam pendentes do backend. A service role não foi adicionada ao frontend. Com RLS ligado e sem policies, o frontend não deve tentar ler/gravar as tabelas de referência com a chave anon.

## Verificação

### Correção da separação de PDFs

A leitura recompõe as linhas pelas coordenadas do PDF e separa os itens pela numeração, incluindo `Questão 1 —`, `Questão 1 –`, `Questão 1 -` e `1.`. A separação considera o documento inteiro para manter questões que continuam na próxima página. Cabeçalhos, números de página e a seção de gabarito são excluídos dos enunciados e alternativas. Quando a disciplina aparece no título do próprio item, ela é preservada individualmente.

A extração valida rótulos consecutivos sem repetição (A–E). Blocos com duas sequências A–D, mais de cinco alternativas ou fronteiras ambíguas não são truncados nem juntados: a tela informa quais blocos precisam de conferência. A regra local de 2 a 5 alternativas também é aplicada à importação estruturada e à aprovação. O padrão de criação permanece quatro e verdadeiro/falso exige duas. Extrações antigas inválidas precisam ser reprocessadas; resultados mesclados não são reutilizados por posição.

A suíte atual possui 36 testes. Foram acrescentadas regressões com o texto da imagem enviada, separadores com travessão, conteúdo emitido em uma linha, alternativas entre páginas, sequências repetidas e texto de PDF fora da ordem visual. No navegador, um PDF de teste reconstruído do exemplo produziu três questões com quatro alternativas cada e gabarito separado corretamente.

23 testes Vitest cobrem contrato do seed, metadados, índices de gabarito, verdadeiro/falso, bloqueios de exportação, HTML seguro, fórmulas, limites de imagem, XLSX, aplicação de dados comuns, gabaritos em lote e leitura de cabeçalhos explícitos. TypeScript, lint e build foram executados.

No Chrome foram conferidos: modelos baixáveis, importação XLSX, HTML/KaTeX, verdadeiro/falso, múltiplos códigos BNCC, imagens locais persistidas, bloqueio de exportação de mídia pendente, payload final, PDF com seis questões e layout de 390 px. Nenhum SQL foi executado e nada foi enviado ao GitHub.
