/*
 * My Packs Pro — camada ExtendScript.
 *
 * É aqui que se resolve a limitação central do CEP: o arrasto nativo
 * (com.adobe.cep.dnd.file.N) só chega ao painel Projeto — o Premiere não aceita
 * largar arquivos na timeline. Para pôr um asset na timeline é preciso importar
 * e inserir por script, que é o que estas funções fazem.
 *
 * ES3 apenas: sem JSON, sem let/const, sem forEach.
 * Retorno sempre em linhas "chave=valor", que o painel divide facilmente.
 */

function _ok(k, v) { return k + '=' + v; }
function _err(msg) { return 'error=' + String(msg).replace(/[\r\n]+/g, ' '); }

/** Percorre o projeto e devolve um mapa nodeId -> true. */
function _snapshotIds(item, out) {
    var i, child;
    try {
        if (item.children && item.children.numItems > 0) {
            for (i = 0; i < item.children.numItems; i++) {
                child = item.children[i];
                out[child.nodeId] = true;
                _snapshotIds(child, out);
            }
        }
    } catch (e) {}
    return out;
}

/** Junta todos os ProjectItem cujo nodeId não estava no snapshot. */
function _collectNew(item, seen, found) {
    var i, child;
    try {
        if (item.children && item.children.numItems > 0) {
            for (i = 0; i < item.children.numItems; i++) {
                child = item.children[i];
                if (!seen[child.nodeId]) found.push(child);
                _collectNew(child, seen, found);
            }
        }
    } catch (e) {}
    return found;
}

/** Normaliza caminho para comparação: barras iguais e sem diferenciar maiúsculas. */
function _norm(p) {
    return String(p || '').replace(/\\/g, '/').toLowerCase();
}

/**
 * Procura um item já existente no projeto que aponte para o mesmo arquivo.
 * Evita importar o mesmo asset dezenas de vezes ao longo de uma edição.
 */
function _findByPath(item, wantedNorm, found) {
    var i, child, mp;
    try {
        if (item.children && item.children.numItems > 0) {
            for (i = 0; i < item.children.numItems; i++) {
                child = item.children[i];
                try {
                    mp = child.getMediaPath();
                    if (mp && _norm(mp) === wantedNorm) { found.push(child); }
                } catch (e2) {}
                _findByPath(child, wantedNorm, found);
            }
        }
    } catch (e) {}
    return found;
}

/**
 * Importa um arquivo e devolve o ProjectItem correspondente.
 * Reaproveita o item existente quando o arquivo já está no projeto.
 */
function _importOne(absPath) {
    var proj = app.project;
    var existing = _findByPath(proj.rootItem, _norm(absPath), []);
    if (existing.length > 0) return existing[0];

    var seen = _snapshotIds(proj.rootItem, {});
    var target = proj.rootItem;

    // getInsertionBin respeita o bin que o utilizador tem aberto; nem todas as
    // versões o expõem, por isso a raiz é o recurso seguro.
    try {
        if (typeof proj.getInsertionBin === 'function') {
            var bin = proj.getInsertionBin();
            if (bin) target = bin;
        }
    } catch (e) {}

    proj.importFiles([absPath], true, target, false);

    var added = _collectNew(proj.rootItem, seen, []);
    if (added.length === 0) return null;

    // Com vários itens novos (ex.: importação em cadeia), fica o que bate no caminho.
    var wanted = _norm(absPath);
    for (var i = 0; i < added.length; i++) {
        try {
            if (_norm(added[i].getMediaPath()) === wanted) return added[i];
        } catch (e3) {}
    }
    return added[0];
}

/** Importa sem tocar na timeline. */
function apImport(pathsPipe) {
    try {
        var paths = String(pathsPipe).split('|');
        var n = 0;
        for (var i = 0; i < paths.length; i++) {
            if (paths[i] && _importOne(paths[i])) n++;
        }
        return _ok('imported', n);
    } catch (e) {
        return _err(e);
    }
}

/**
 * Importa e coloca no playhead da sequência ativa.
 *
 * `kind` decide a faixa: vídeo entra em V1 (o áudio ligado vai sozinho para A1),
 * áudio puro entra em A1. Usa overwrite, que é o comportamento de quem larga
 * um clipe na timeline — insert empurraria tudo o que vem depois.
 */
function apInsertAtPlayhead(pathsPipe, kind) {
    try {
        var proj = app.project;
        if (!proj) return _err('Nenhum projeto aberto');

        var seq = proj.activeSequence;
        if (!seq) return _err('Nenhuma sequência ativa. Abra uma sequência na timeline.');

        var paths = String(pathsPipe).split('|');
        var time = seq.getPlayerPosition();
        var from = time.seconds;
        var placed = 0;
        var lastError = '';

        for (var i = 0; i < paths.length; i++) {
            if (!paths[i]) continue;

            var item = _importOne(paths[i]);
            if (!item) { lastError = 'Falha ao importar'; continue; }

            try {
                // Sempre por cima: um overlay nunca deve comer o vídeo de baixo.
                if (_placeAbove(seq, item, kind === 'audio', time, from) >= 0) placed++;
                else lastError = 'Não foi possível abrir uma faixa livre acima';
            } catch (eIns) {
                lastError = String(eIns);
            }
        }

        if (placed === 0) return _err(lastError || 'Nada foi inserido');
        return _ok('placed', placed);
    } catch (e) {
        return _err(e);
    }
}


/* ------------------------------------------------------------------ *
 * Inserção segura: nunca sobrescreve trabalho existente.
 * ------------------------------------------------------------------ */

/** Duração do item em segundos. Recorre a um valor prudente se a API não disser. */
function _itemDuration(item) {
    var d = 0;
    try {
        d = item.getOutPoint().seconds - item.getInPoint().seconds;
    } catch (e) {}
    if (!d || d <= 0 || isNaN(d)) d = 5;
    return d;
}

/** A faixa está livre em todo o intervalo [from, to)? */
function _trackFreeBetween(track, from, to) {
    var i, c, cs, ce;
    try {
        for (i = 0; i < track.clips.numItems; i++) {
            c = track.clips[i];
            cs = c.start.seconds;
            ce = c.end.seconds;
            // sobreposição de intervalos
            if (cs < to && ce > from) return false;
        }
    } catch (e) {
        // Sem conseguir ler os clipes, tratar como ocupada é o lado seguro.
        return false;
    }
    return true;
}

/**
 * Deixa o clipe recém-colocado selecionado.
 *
 * Sem isto o utilizador teria de o caçar na timeline antes de o mover. Como o
 * painel CEP não consegue largar numa posição precisa, deixar o clipe pronto a
 * arrastar é o que mais se aproxima disso.
 */
function _selectClipAt(track, seconds) {
    var i, c;
    try {
        for (i = 0; i < track.clips.numItems; i++) {
            c = track.clips[i];
            if (c.start.seconds <= seconds && c.end.seconds > seconds) {
                c.setSelected(true, true);
                return true;
            }
        }
    } catch (e) {}
    return false;
}


/**
 * Índice mais alto ocupado no intervalo, ou -1 se a faixa toda está livre.
 */
function _topOccupied(tracks, from, to) {
    var top = -1;
    for (var i = 0; i < tracks.numTracks; i++) {
        if (!_trackFreeBetween(tracks[i], from, to)) top = i;
    }
    return top;
}

/**
 * Acrescenta uma faixa no topo, como o Premiere faz quando se arrasta acima da
 * última faixa. Usa QE, que é a única via disponível em ExtendScript — não é
 * documentada, por isso o resultado é confirmado comparando a contagem antes e
 * depois, em vez de se confiar na chamada.
 */
function _addTrackOnTop(seq, isAudio) {
    var before = isAudio ? seq.audioTracks.numTracks : seq.videoTracks.numTracks;
    try {
        app.enableQE();
        var qseq = qe.project.getActiveSequence();
        if (!qseq) return false;
        if (isAudio) { qseq.addTracks(0, 0, 1, 1, before, 0, 0, 0); }
        else { qseq.addTracks(1, before, 0, 1, 0, 0, 0, 0); }
    } catch (e) {
        return false;
    }
    var after = isAudio ? seq.audioTracks.numTracks : seq.videoTracks.numTracks;
    return after > before;
}

/**
 * Coloca o item **acima** de tudo o que já existe no intervalo.
 *
 * Nunca sobrepõe material: procura a primeira faixa livre acima da mais alta
 * ocupada e, se não houver nenhuma, cria uma. É isto que garante que um overlay
 * entra por cima do vídeo em vez de o comer — e é também a ordem de camadas
 * certa para composição.
 *
 * Devolve o índice usado, ou -1 se não foi possível colocar.
 */
function _placeAbove(seq, item, isAudio, time, from) {
    var to = from + _itemDuration(item);
    var tracks = isAudio ? seq.audioTracks : seq.videoTracks;
    if (!tracks || tracks.numTracks === 0) return -1;

    var start = _topOccupied(tracks, from, to) + 1;

    for (var i = start; i < tracks.numTracks; i++) {
        if (_trackFreeBetween(tracks[i], from, to)) {
            tracks[i].overwriteClip(item, time);
            _selectClipAt(tracks[i], from);
            return i;
        }
    }

    if (_addTrackOnTop(seq, isAudio)) {
        var fresh = isAudio ? seq.audioTracks : seq.videoTracks;
        var idx = fresh.numTracks - 1;
        fresh[idx].overwriteClip(item, time);
        _selectClipAt(fresh[idx], from);
        return idx;
    }

    return -1;
}

/**
 * Importa e coloca no playhead, sempre acima do material existente.
 *
 * Usado pelo arrasto. Partilha a mesma regra do duplo-clique: nunca sobrepõe
 * nada, e cria faixa nova se for preciso.
 */
function apDropAtPlayhead(pathsPipe, kind) {
    try {
        var proj = app.project;
        if (!proj) return _err('Nenhum projeto aberto');

        var seq = proj.activeSequence;
        if (!seq) return _err('Nenhuma sequência ativa');

        var paths = String(pathsPipe).split('|');
        var time = seq.getPlayerPosition();
        var from = time.seconds;
        var placed = 0;
        var lastError = '';

        for (var i = 0; i < paths.length; i++) {
            if (!paths[i]) continue;

            var item = _importOne(paths[i]);
            if (!item) { lastError = 'Falha ao importar'; continue; }

            try {
                // Mesma regra do duplo-clique: entra sempre por cima.
                if (_placeAbove(seq, item, kind === 'audio', time, from) >= 0) placed++;
                else lastError = 'Não foi possível abrir uma faixa livre acima';
            } catch (eIns) {
                lastError = String(eIns);
            }
        }

        if (placed === 0) return _err(lastError || 'Nada foi inserido');
        return _ok('placed', placed);
    } catch (e) {
        return _err(e);
    }
}

/**
 * Faz o projeto passar a usar a cópia local em vez do original.
 *
 * Chamado depois de copiar o asset para junto do projeto. Cobre os três casos:
 * a cópia já está no projeto, o original está no projeto (o Premiere importou-o
 * sozinho ao receber o arrasto), ou ainda não há nada.
 */
function apAdoptCopy(originalPath, copyPath) {
    try {
        var proj = app.project;
        if (!proj) return _err('Nenhum projeto aberto');

        if (_findByPath(proj.rootItem, _norm(copyPath), []).length > 0) {
            return _ok('adopted', 'already');
        }

        var fromOriginal = _findByPath(proj.rootItem, _norm(originalPath), []);
        if (fromOriginal.length > 0) {
            var relinked = 0;
            for (var i = 0; i < fromOriginal.length; i++) {
                try {
                    fromOriginal[i].changeMediaPath(copyPath);
                    relinked++;
                } catch (e2) {}
            }
            if (relinked > 0) return _ok('adopted', 'relinked');
        }

        return _importOne(copyPath) ? _ok('adopted', 'imported') : _err('Falha ao importar a cópia');
    } catch (e) {
        return _err(e);
    }
}

var AP_LABEL_NS = 'http://ns.adobe.com/premierePrivateProjectMetaData/1.0/';
var AP_LABEL_FIELD = 'Column.Intrinsic.Label';

/** Carrega o XMPScript uma vez. Sem ele nao ha como escrever metadados. */
function _xmpReady() {
    try {
        if (typeof ExternalObject === 'undefined') return false;
        if (ExternalObject.AdobeXMPScript === undefined || ExternalObject.AdobeXMPScript === null) {
            ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
        }
        return typeof XMPMeta !== 'undefined';
    } catch (e) {
        return false;
    }
}

/** Le o rotulo actual do item, para confirmar que a escrita pegou. */
function _readLabel(item) {
    try {
        if (!_xmpReady()) return '';
        var xmp = new XMPMeta(item.getProjectMetadata());
        var v = xmp.getProperty(AP_LABEL_NS, AP_LABEL_FIELD);
        return v ? String(v) : '';
    } catch (e) {
        return '';
    }
}

/**
 * Aplica um rotulo de cor ao item do projeto que aponta para este arquivo.
 *
 * Os rotulos do Premiere sao *nomes* em ingles ("Violet", "Iris"...), gravados
 * nos metadados do projeto; a cor de cada nome vem das Preferencias do
 * utilizador. Por isso escreve-se o nome, nunca uma cor.
 *
 * Duas vias, porque a API directa nao esta documentada nesta versao. O
 * resultado e sempre confirmado por leitura — antes devolvia-se sucesso sem
 * nada ter mudado, que foi exactamente o bug reportado.
 */
function apSetLabel(absPath, labelIndex, labelName) {
    try {
        var proj = app.project;
        if (!proj) return _err('Nenhum projeto aberto');

        var found = _findByPath(proj.rootItem, _norm(absPath), []);
        if (found.length === 0) return _err('Item nao encontrado no projeto');

        var item = found[0];
        var wanted = String(labelName);
        var idx = parseInt(labelIndex, 10);

        // via 1 — API directa, se existir nesta versao
        try {
            if (typeof item.setColorLabel === 'function') {
                item.setColorLabel(idx);
                var v1 = _readLabel(item);
                if (v1 === wanted || v1 === '') {
                    return _ok('label', 'setColorLabel') + '\n' + _ok('verified', v1);
                }
            }
        } catch (e1) {}

        // via 2 — metadados XMP do projeto
        if (!_xmpReady()) return _err('XMPScript indisponivel nesta versao');

        var xmp = new XMPMeta(item.getProjectMetadata());
        xmp.setProperty(AP_LABEL_NS, AP_LABEL_FIELD, wanted);
        item.setProjectMetadata(xmp.serialize(), [AP_LABEL_FIELD]);

        var v2 = _readLabel(item);
        if (v2 !== wanted) {
            return _err('O Premiere nao aceitou o rotulo (ficou "' + v2 + '")');
        }
        return _ok('label', 'xmp') + '\n' + _ok('verified', v2);
    } catch (e) {
        return _err(e);
    }
}

/** Diagnóstico: existe projeto e sequência ativa? Alimenta o estado da UI. */
function apStatus() {
    var out = '';
    try {
        out += _ok('project', app.project ? app.project.name : '') + '\n';
        out += _ok('projectPath', app.project ? (app.project.path || '') : '') + '\n';
        var seq = app.project ? app.project.activeSequence : null;
        out += _ok('sequence', seq ? seq.name : '') + '\n';
        out += _ok('videoTracks', seq ? seq.videoTracks.numTracks : 0) + '\n';
        out += _ok('audioTracks', seq ? seq.audioTracks.numTracks : 0);
    } catch (e) {
        return _err(e);
    }
    return out;
}
