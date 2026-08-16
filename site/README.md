# Site do My Packs Pro

Site estático — sem build, sem dependências.

## Publicar no Vercel

1. Importe o repositório em [vercel.com/new](https://vercel.com/new)
2. Em **Root Directory**, escolha `site`
3. Framework Preset: **Other**. Deixe Build e Output vazios.
4. Deploy

Qualquer push para `main` republica sozinho.

## O botão de download

Aponta para:

```
https://github.com/Bielicoman/mypackspro/releases/latest/download/MyPacksPro.zxp
```

É um endereço permanente: serve sempre o anexo da Release mais recente. Ao
lançar uma versão nova, basta publicar a Release com um anexo de mesmo nome —
o site não precisa ser alterado.
