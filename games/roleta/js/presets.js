/* presets.js — preset data and preset modal */
(function () {
  'use strict';

  const PRESETS = [
    { id: 'comida', icon: '🍕', name: 'Comida', items: ['Pizza', 'Sushi', 'Hambúrguer', 'Salada', 'Pastel', 'Açaí', 'Churrasco', 'Tapioca', 'Hot dog', 'Frango frito'] },
    { id: 'semana', icon: '📅', name: 'Dias da semana', items: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] },
    { id: 'simnao', icon: '✅', name: 'Sim ou Não', items: ['Sim', 'Não'] },
    { id: 'numeros', icon: '🎲', name: 'Números 1–6', items: ['1', '2', '3', '4', '5', '6'] },
    { id: 'cores', icon: '🎨', name: 'Cores', items: ['Vermelho', 'Azul', 'Verde', 'Amarelo', 'Laranja', 'Roxo', 'Rosa', 'Branco', 'Preto'] },
    { id: 'filmes', icon: '🎬', name: 'Gêneros de filme', items: ['Ação', 'Comédia', 'Terror', 'Romance', 'Ficção científica', 'Drama', 'Animação', 'Suspense'] },
    { id: 'esportes', icon: '🏆', name: 'Esportes', items: ['Futebol', 'Vôlei', 'Basquete', 'Natação', 'Corrida', 'Ciclismo', 'Tênis', 'Surf'] },
    { id: 'musica', icon: '🎵', name: 'Ritmos', items: ['Funk', 'Sertanejo', 'Pagode', 'Rock', 'Pop', 'MPB', 'Eletrônico', 'Forró'] },
    { id: 'materias', icon: '📚', name: 'Matérias', items: ['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Inglês', 'Física', 'Química'] },
    { id: 'paises', icon: '🌍', name: 'Países', items: ['Brasil', 'Estados Unidos', 'França', 'Japão', 'Itália', 'Espanha', 'Portugal', 'Argentina', 'México', 'Alemanha'] },
  ];

  function openModal() {
    const S = window.SpinState;
    S.selectedPresetId = null;
    renderGrid();
    document.getElementById('presets-preview').hidden = true;
    document.getElementById('btn-presets-replace').disabled = true;
    document.getElementById('btn-presets-append').disabled = true;
    document.getElementById('presets-overlay').hidden = false;
  }

  function closeModal() {
    document.getElementById('presets-overlay').hidden = true;
  }

  function renderGrid() {
    const S = window.SpinState;
    const grid = document.getElementById('presets-grid');
    grid.innerHTML = '';
    PRESETS.forEach((p) => {
      const btn = document.createElement('button');
      btn.className = 'preset-chip' + (p.id === S.selectedPresetId ? ' is-selected' : '');
      btn.innerHTML =
        `<span class="preset-chip-icon">${p.icon}</span>` +
        `<span class="preset-chip-name">${p.name}</span>` +
        `<span class="preset-chip-count">${p.items.length} itens</span>`;
      btn.addEventListener('click', () => selectPreset(p.id));
      grid.appendChild(btn);
    });
  }

  function selectPreset(id) {
    const S = window.SpinState;
    S.selectedPresetId = id;
    const preset = PRESETS.find((p) => p.id === id);
    renderGrid();
    document.getElementById('presets-preview-label').textContent = `${preset.icon} ${preset.name} — ${preset.items.length} itens`;
    document.getElementById('presets-preview-items').textContent = preset.items.join(' · ');
    document.getElementById('presets-preview').hidden = false;
    document.getElementById('btn-presets-replace').disabled = false;
    document.getElementById('btn-presets-append').disabled = false;
  }

  function applyPreset(mode) {
    const S = window.SpinState;
    const preset = PRESETS.find((p) => p.id === S.selectedPresetId);
    if (!preset) return;
    const labels = preset.items;
    if (mode === 'replace') {
      S.items = labels.map((label, i) => ({
        id: window.Utils.uid(),
        label,
        color: window.Utils.colorForIndex(S.tweaks.palette, i),
      }));
    } else {
      const start = S.items.length;
      S.items = [
        ...S.items,
        ...labels.map((label, i) => ({
          id: window.Utils.uid(),
          label,
          color: window.Utils.colorForIndex(S.tweaks.palette, start + i),
        })),
      ];
    }
    window.SpinStorage.saveItems(S.items);
    S.wheel.setItems(S.items);
    window.SpinRender.renderList();
    window.SpinRender.updateCount();
    closeModal();
    window.Utils.toast(`${labels.length} itens carregados`);
  }

  window.SpinPresets = { PRESETS, openModal, closeModal, applyPreset };
})();
