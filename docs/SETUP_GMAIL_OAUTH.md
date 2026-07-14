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

## 4. Evitar expiração semanal do token

Se a tela de consentimento OAuth do Google estiver em `Testing`, o refresh token pode expirar em cerca de 7 dias. Quando isso acontece, o GitHub Actions falha em `Validar autenticação Gmail`.

Para reduzir esse problema:

1. Abra o Google Cloud Console.
2. Vá em `APIs e serviços`.
3. Vá em `Tela de consentimento OAuth`.
4. Procure `Publishing status`.
5. Se estiver `Testing`, publique como `Production`.
6. Gere um novo `token.json`:

```powershell
npm.cmd run auth:gmail
```

7. Atualize o Secret `GOOGLE_TOKEN_JSON` no GitHub.

## 5. O que nunca subir no GitHub

Nunca suba:

```text
credentials.json
token.json
.env
```

Esses arquivos ficam no seu computador ou viram Secrets no GitHub.
