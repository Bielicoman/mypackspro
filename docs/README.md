# Documentação

## `skill-premiere-cep.md`

Skill do Claude Code com o conhecimento acumulado ao construir este plugin:
factos medidos sobre o CEP no Premiere Pro, armadilhas que custaram horas e o
método que evitou a maior parte dos bugs.

Vive aqui para ter histórico. Quando aprendermos algo novo, **a mudança entra
neste arquivo** — o Git mostra o que mudou e porquê. A cópia em
`~/.claude/skills/` é só o que o Claude carrega em runtime.

### Instalar

Windows (Git Bash):

```bash
mkdir -p ~/.claude/skills/premiere-cep-plugin
cp docs/skill-premiere-cep.md ~/.claude/skills/premiere-cep-plugin/SKILL.md
```

macOS / Linux:

```bash
mkdir -p ~/.claude/skills/premiere-cep-plugin && cp docs/skill-premiere-cep.md ~/.claude/skills/premiere-cep-plugin/SKILL.md
```

A partir daí ela carrega sozinha sempre que o assunto for extensão do Premiere.

### Editou primeiro a cópia instalada?

Traga de volta antes de commitar, senão a mudança perde-se na próxima instalação:

```bash
cp ~/.claude/skills/premiere-cep-plugin/SKILL.md docs/skill-premiere-cep.md
```

### O que merece entrar

Coisas que **medimos**, não que supomos. Cada linha nova devia poder responder
"como é que sabemos isto?" — versão testada, comando corrido, comportamento
observado. Uma suposição errada aqui custa mais caro que uma lacuna.
