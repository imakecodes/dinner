
# Dinner? 🥗
**Acabe com a indecisão e cozinhe melhor.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-blueviolet)
![Gemini AI](https://img.shields.io/badge/AI-Gemini%201.5-orange)

**Dinner?** é um assistente de cozinha inteligente, desenvolvido para resolver a eterna pergunta: *"O que vamos comer hoje?"*. Ele combina uma despensa digital, listas de compras colaborativas e um poderoso Chef IA para transformar os ingredientes que você já tem em receitas deliciosas e personalizadas.

---

## ✨ Funcionalidades

### 👨‍🍳 Chef Executivo IA
*   **Geração Inteligente**: Cria receitas únicas baseadas no que você *realmente* tem na despensa.
*   **Personalizado**: Respeita restrições alimentares, tipos de refeição (Rápida, Jantar, Lanche) e tempo de preparo.
*   **Modo Chef**: Guia interativo passo a passo para você não se perder no preparo.
*   **Cozinha Global**: Traduza instantaneamente qualquer receita para o seu idioma preferido (Português/Inglês).

### 🏠 Cozinhas Conectadas
*   **Sincronia Familiar**: Convide familiares ou colegas de quarto para sua cozinha digital.
*   **Gestão Compartilhada**: Todos veem a mesma despensa e lista de compras em tempo real.
*   **Controle de Acesso**: Gerencie permissões com funções de Administrador e Membro.

### 🛒 Compras Inteligentes
*   **Fluxo Contínuo**: Adicione ingredientes faltantes das receitas direto para sua lista de compras.
*   **Organização Esperta**: Visualize itens filtrados por receita ou veja a lista geral.
*   **Compartilhamento Fácil**: Copie sua lista filtrada para a área de transferência e mande no WhatsApp.

### 🍱 Despensa Digital
*   **Inventário na Mão**: Saiba exatamente o que tem na geladeira sem precisar abrir a porta.
*   **Desperdício Zero**: A IA prioriza ingredientes que você já possui, economizando dinheiro e evitando desperdício.

---

## 🛠️ Stack Tecnológica

Construído com tecnologias web modernas para performance e escala:

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
*   **Banco de Dados**: [MariaDB](https://mariadb.org/) & [Prisma ORM](https://www.prisma.io/)
*   **Motor de IA**: [Google Gemini 1.5](https://deepmind.google/technologies/gemini/) (Pro & Flash)
*   **Estilização**: [TailwindCSS](https://tailwindcss.com/)
*   **Autenticação**: JWT próprio com fluxo seguro de recuperação de senha.
*   **Infraestrutura**: Pronto para Docker & Docker Compose.

---

## 🚀 Como Começar (Getting Started)

### Pré-requisitos
*   Node.js 18+
*   Docker & Docker Compose (para o banco de dados)
*   Chave de API do Google Gemini

### Início Rápido (Desenvolvimento)

1.  **Clone o repositório**:
    ```bash
    git clone https://github.com/imakecodes/dinner.git
    cd dinner
    ```

2.  **Configure o ambiente**:
    ```bash
    cp .env.example .env
    # Edite o .env com sua GEMINI_API_KEY e credenciais do banco
    ```

3.  **Inicie o banco de dados**:
    ```bash
    docker compose up -d
    ```

4.  **Instale dependências e envie o schema**:
    ```bash
    pnpm install
    pnpm db:push
    ```

5.  **Rode a aplicação**:
    ```bash
    pnpm dev
    ```

Acesse `http://localhost:3000` e comece a cozinhar!

---

## 🤝 Contribuição

Contribuições são bem-vindas! Seja corrigindo um bug (como nossas melhorias recentes na codificação UTF-8!) ou adicionando uma nova funcionalidade, sinta-se à vontade para abrir um Pull Request.

## 📄 Licença

Este projeto é open source e está disponível sob a [Licença MIT](LICENSE).
