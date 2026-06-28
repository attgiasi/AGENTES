# Arquitetura do projeto

## Decisão prática

O prompt original sugeria uma stack com TypeScript, React, Vite, Tailwind e Prisma.

Como este projeto já estava funcionando com Gmail autorizado, painel local, GitHub Actions, OpenAI/Gemini e banco SQLite, a decisão mais segura foi evoluir a base atual sem reescrever tudo.

Stack atual:

- Node.js 24;
- Express;
- HTML/CSS/JavaScript no painel;
- SQLite nativo do Node;
- Gmail API;
- OpenAI API;
- Gemini API opcional;
- GitHub Actions;
- endpoints para Siri/Atalhos.

## Por que não reescrever agora

Reescrever para React/TypeScript/Prisma traria mais estrutura, mas também aumentaria o risco de:

- quebrar OAuth já autorizado;
- atrasar o uso real;
- introduzir novos erros de build;
- exigir mais instalação para usuário leigo.

## Caminho futuro

Quando a base estiver estável, uma v2 pode ter:

```text
/backend TypeScript + Prisma
/frontend React + Vite + Tailwind
/docs documentação separada
```

Por enquanto, o foco é:

- funcionar;
- ser seguro;
- ser fácil de configurar;
- rodar no GitHub;
- ter painel controlável.
