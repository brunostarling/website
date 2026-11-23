# Bruno Starling — Portfólio

Site de portfólio animado para designer. HTML, CSS e JavaScript puros, sem dependências nem etapa de build.

## Rodar localmente

```bash
python3 -m http.server 8080
# abra http://localhost:8080
```

## Estrutura

```
index.html        conteúdo e seções
css/style.css     visual, animações e responsivo
js/projects.js    ← seus projetos (edite aqui)
js/main.js        motion: canvas generativo, cursor, scroll, filtros, modal
assets/           favicon e suas imagens/vídeos
```

## O que tem

- Preloader com contador e cortina
- Hero com campo de partículas generativo (reage ao mouse) e título com animação letra a letra
- Marquee que acelera e inclina conforme a velocidade do scroll
- Manifesto que "acende" palavra por palavra ao rolar
- Contadores animados, parallax, cursor customizado e botões magnéticos
- Portfólio com capas animadas em código, filtros e estudo de caso em tela cheia
- Serviços em acordeão, linha do tempo do processo, depoimentos e marquee de clientes
- Formulário com validação que abre o e-mail com a mensagem pronta
- Responsivo (375px+), navegável por teclado e respeita `prefers-reduced-motion`

## Personalizar

1. **Projetos:** edite `js/projects.js`. Para usar imagem ou vídeo real no lugar da capa animada, adicione `image: "assets/projetos/x.jpg"` ou `video: "assets/projetos/x.mp4"`.
2. **Textos, e-mail e redes:** em `index.html` (procure por `ola@brunostarling.com` e pelos links `href="#"` das redes sociais).
3. **Cores e fontes:** variáveis no topo de `css/style.css` (`--accent`, `--bg` etc.).
4. **Foto:** troque o bloco `.portrait__art` por uma `<img>`.

## Publicar

Funciona em qualquer hospedagem estática: GitHub Pages (Settings → Pages → branch), Netlify ou Vercel (arraste a pasta).
