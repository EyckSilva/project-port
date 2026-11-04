# Mapa do backlog para o frontend

Referência: issues abertas de `R-Neto-dev/Mentary-squad-46`, documentos enviados e frontend `EyckSilva/mentary-s46`. Revisão local de 30/10/2026. As issues abertas foram usadas como lista do backlog; nenhum cartão ou status do GitHub Projects foi alterado.

“Implementado localmente” significa a parte executável no navegador. Não significa que a issue full stack possa ser encerrada; contratos e integrações precisam ser validados com o backend e a Raiatech.

| Issues     | Parte disponível no frontend                                                                                      | Dependências restantes                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| #10 / US01 | Upload, PDF com texto por regras, CSV/JSON, revisão rápida e incerteza; sem inventar gabarito                     | OCR e extração complexa de produção                     |
| #11        | Feedback/progresso não bloqueante, status enviado/processando/extraído/erro, original preservado e retomada local | Fila e endpoint de status; processamento fora da aba    |
| #12        | Erros claros, timeout de PDF, três tentativas e revisão manual                                                    | Retentativas e observabilidade do OCR/IA no servidor    |
| #14 / US02 | Original lado a lado, página, zoom, navegação e aviso de confiança                                                | Confiança por campo e crops automáticos do extrator     |
| #15 / US03 | Editar texto, alternativas, gabarito, imagem e classificação; bloquear aprovação incompleta                       | Validação/persistência na API                           |
| #16 / US04 | Responsável/data UTC, histórico de alterações consultável sem editor; edição invalida aprovação                   | Auditoria protegida e imutável no servidor              |
| #17        | Todas as entradas de aprovação validam texto, alternativas, gabarito e habilidade compatível                      | Regras transacionais no backend                         |
| #19 / US05 | Distribuição, alertas, confirmação explícita; mudanças invalidam publicação                                       | Publicação persistida pela API                          |
| #20 / US06 | Seleção/filtros, ordenação, rascunhos e publicação local após validação                                           | Integração com Banco/Construtor da Mentary              |
| #24 / US07 | Individual/turma por habilidade/descritor; recálculo pelas respostas locais                                       | Dados reais e atualização por API                       |
| #25 / US08 | Código/descrição/componente, questões/estudantes/respostas, acertos/erros/omissões, tempo, atenção e comparação   | Dados e catálogo oficiais                               |
| #26        | Catálogo compartilhado com busca/componente/etapa/relação habilidade-descritor                                    | Fonte oficial, banco, seed e endpoint                   |
| #28 / US09 | Painel consolidado e filtro por escola                                                                            | Resultados reais da rede                                |
| #29 / US10 | Selecionar escolas e comparar na mesma aplicação                                                                  | Escopo e atualizações da API                            |
| #30 / US11 | Relatório consolidado/por escola; última aplicação por padrão                                                     | Consolidação oficial                                    |
| #31 / US12 | CSV filtrado, impressão/PDF e registro local da exportação                                                        | Contrato final de exportação                            |
| #32 / US13 | Indicadores, comparações, faixas e detalhes                                                                       | Dados reais para decisões                               |
| #34 / US14 | Turmas, distribuição por faixa, descritores críticos, comparações e acompanhamento                                | Sessão/escopo e dados oficiais                          |
| #36 / US15 | Consolidação da escola e filtro por componente, tabela e gráfico                                                  | Resultados reais                                        |
| #37 / US16 | Selecionar turmas na mesma aplicação                                                                              | Resultados reais                                        |
| #38 / US17 | Comparação entre aplicações e variação em pontos percentuais                                                      | Histórico real                                          |
| #39 / US18 | Descritor/componente, atenção e detalhamento                                                                      | Dados reais e catálogo                                  |
| #40 / US19 | Alerta textual de queda por grupo com limiar configurável                                                         | Notificações persistentes de produção                   |
| #41 / US20 | Indicadores consolidados e detalhes no mesmo ambiente                                                             | API de consolidação                                     |
| #43 / US21 | Regras sugerem grupo/questões/sequência; ajuste/aprovação humana e status                                         | IA e integração com Banco                               |
| #44 / US22 | Diagnóstico/acompanhamento, antes/depois, amostras e variação                                                     | Aplicações reais                                        |
| #47 / US23 | Cadastro/edição/perfil/revisão, exclusões com vínculos bloqueadas, rotas demonstrativas                           | Autenticação, autorização e escopo no servidor          |
| #48 / US24 | Modelo CSV, validação/duplicidades, prévia de erros e confirmação dos válidos                                     | Cadastro centralizado                                   |
| #49 / US25 | QR Code com ID cadastrado, PNG e carteirinha imprimível                                                           | Resolução do QR conforme contrato Mentary               |
| #50        | Scripts lint/typecheck/test/build e workflow local preparado                                                      | Actions/proteção de branch não executados nem alterados |
| #51 e #54  | React/TS existente e Docker/Compose somente do frontend                                                           | Backend, PostgreSQL, ORM, migrations e healthcheck      |
| #57 e #58  | Conjunto de ajustes acima; não há critérios adicionais nas descrições                                             | Confirmar a divisão do trabalho do squad                |

## Épicos e itens sem tela própria

#9, #13, #18, #23, #27, #33, #35, #42, #45 e #46 agrupam as histórias acima. #21 (modelagem) e #22 (Swagger) são backend. #53 é documentação de arquitetura sem ajuste visual especificado. #7 é organização do backlog/Projects; não houve alteração remota.

## Verificação e limites

- TypeScript, build de produção e ESLint sem erros; avisos de Fast Refresh da estrutura de componentes.
- Vitest: extração/aprovação, invalidação de publicação, indicadores/recálculo, CSV e rotas.
- Chrome via Playwright: telas principais, upload JSON → bloqueios → aprovação → persistência, confirmação do validador, CSV com linha inválida, exportação filtrada, QR, PDF digitalizado com erro controlado e tela móvel de 390 px sem overflow da página.
- Cores preservadas; tabelas alternativas aos gráficos.

Docker/Compose e workflow foram preparados, mas não executados neste ambiente. A auditoria npm registra alertas nas dependências herdadas do template, incluindo Vite; revisar a atualização coordenada do template antes de produção. Os dados e catálogos são demonstrativos; armazenamento e permissões de navegador não garantem segurança ou auditoria imutável.
