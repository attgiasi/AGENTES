# Configurar Gmail OAuth

Este guia é para conectar sua conta Gmail ao agente.

## 1. Criar credencial no Google Cloud

1. Entre em https://console.cloud.google.com/
2. Crie ou selecione um projeto.
3. Vá em `APIs e serviços`.
4. Ative a `Gmail API`.
5. Vá em `Credenciais`.
6. Crie uma credencial OAuth do tipo `Aplicativo para computador`.
7. Baixe o JSON.
8. Renomeie para `credentials.json`.
9. Coloque na raiz do projeto.

## 2. Autorizar localmente

No PowerShell, dentro da pasta do projeto:

```powershell
npm.cmd run auth:gmail
```

O navegador vai abrir. Faça login, aceite as permissões e volte ao terminal.

Quando terminar, será criado o arquivo:

```text
token.json
```

## 3. Testar se o token ainda está válido

Rode:

```powershell
npm.cmd run gmail:check
```

Se aparecer `Gmail conectado com sucesso`, está tudo certo.

Se aparecer `invalid_grant`, gere um novo token com:

```powershell
npm.cmd run auth:gmail
```

Depois atualize o Secret `GOOGLE_TOKEN_JSON` no GitHub com o novo conteúdo do `token.json`.

## 4. O que nunca subir no GitHub

Nunca suba:

```text
credentials.json
token.json
.env
```

Esses arquivos ficam no seu computador ou viram Secrets no GitHub.
