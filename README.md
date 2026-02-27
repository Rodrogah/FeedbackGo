# FeedbackGo - Plataforma Empresarial

O **FeedbackGo** é um sistema SaaS (Software as a Service) completo, focado na gestão de atividades, aumento de produtividade e acompanhamento de equipes em tempo real. Construído com uma arquitetura *serverless* utilizando Google Firebase, oferece uma experiência de usuário premium, rápida e totalmente responsiva.

## Principais Funcionalidades

### Gestão de Usuários e Níveis de Acesso
* **Painel Administrativo:** Visão global da empresa, gráficos gerenciais, gestão de equipes, categorias e permissões de usuários.
* **Painel do Funcionário:** Espaço focado na produtividade individual, registro rápido de tarefas e acompanhamento de metas diárias.
* **Recuperação de Senha Segura:** Sistema automatizado de redefinição de credenciais via e-mail.

### Dashboard e Analytics Dinâmicos
* **Gráficos em Tempo Real:** Visualização de dados usando Chart.js (Donut para status, Barras para categorias e Linhas para evolução temporal).
* **Estatísticas Inteligentes:** Contadores automáticos de tarefas pendentes, concluídas, em andamento e usuários ativos.
* **Filtros Avançados:** Pesquisa de atividades por data, membro da equipe ou status.

### Gestão de Atividades Avançada
* **Upload de Múltiplos Arquivos:** Suporte nativo para anexar até 3 arquivos por atividade (com validação de tamanho máximo de 1MB).
* **Histórico de Alterações:** Rastreamento completo (logs) de quem alterou o status da tarefa e quando.
* **Sistema de Paginação:** Navegação otimizada no histórico de atividades, carregando blocos de 20 registros por vez para manter a performance.

### Engenharia e Manutenção
* **Robô de Limpeza Automática (Auto-Cleanup):** Um script inteligente que roda em segundo plano para excluir anexos de atividades com mais de 1 ano, mantendo os custos do banco de dados em zero.
* **Modo Escuro Premium (Dark Mode):** Interface desenhada minuciosamente para ser agradável aos olhos em ambientes de pouca luz, com preservação de contraste em crachás (badges) e formulários.
* **PWA (Progressive Web App):** Suporte nativo para instalação como aplicativo móvel (Android/iOS) diretamente pelo navegador.
* **Exportação de Dados:** Geração de relatórios com exportação direta para planilhas do Excel (.xlsx) e envio de resumos por e-mail.

## Tecnologias Utilizadas

O projeto foi desenvolvido no ecossistema Web Padrão (Vanilla), garantindo máxima velocidade e zero dependências pesadas de frameworks:

* **Front-end:** HTML5, CSS3 (Flexbox/Grid, CSS Variables) e JavaScript (ES6+).
* **Back-end & BaaS:** Google Firebase (Firestore para banco de dados NoSQL em tempo real).
* **Bibliotecas de Suporte:**
  * `Chart.js`: Renderização dos gráficos do dashboard.
  * `SheetJS`: Geração e exportação de planilhas Excel.
  * `EmailJS`: Motor de envio de e-mails transacionais (Boas-vindas, Relatórios e Recuperação de Senha).
  * `FontAwesome`: Ícones vetoriais em toda a interface.
