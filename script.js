const STORAGE_KEY = "noJardimPonto_v2";

// ======= Configuração da tabela (dias da semana) =======
const diasSemana = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

const tbody = document.querySelector("#tabela tbody");

diasSemana.forEach((dia, index) => {
  const tr = document.createElement("tr");
  tr.innerHTML = `
        <td class="day-label">${dia}</td>
        <td><input type="time" id="inicio-${index}"></td>
        <td><input type="time" id="inicioInt-${index}"></td>
        <td><input type="time" id="fimInt-${index}"></td>
        <td><input type="time" id="fim-${index}"></td>
        <td id="totalDia-${index}">0.00</td>
      `;
  tbody.appendChild(tr);
});

// ======= Utilidades de hora =======
function horaParaMinutos(horaStr) {
  if (!horaStr) return null;
  const [h, m] = horaStr.split(":").map(Number);
  return h * 60 + m;
}

function minutosParaDecimalHoras(minutos) {
  return minutos / 60;
}

function formatDecimal(num) {
  return num.toFixed(2);
}

function parseValorHora(valorStr) {
  if (!valorStr) return NaN;
  const limpo = valorStr.replace(/\./g, "").replace(",", ".");
  return parseFloat(limpo);
}

function formatarDataCurta(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function formatarPeriodo(inicioIso, fimIso) {
  if (!inicioIso || !fimIso) return "";
  return `${formatarDataCurta(inicioIso)} - ${formatarDataCurta(fimIso)}`;
}

const moedaBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// ======= ELEMENTOS GERAIS =======
const totalHorasSemanaEl = document.getElementById("totalHorasSemana");
const horasExtrasBadgeEl = document.getElementById("horasExtrasBadge");
const nomeResumoEl = document.getElementById("nomeResumo");
const resumoPagamentoEl = document.getElementById("resumoPagamento");
const erroMensagemEl = document.getElementById("erroMensagem");
const pdfContainer = document.getElementById("pdfContainer");

let ultimaSemana = {
  totalHoras: 0,
  horasExtras: 0,
  horasNormais: 0,
  pagNormais: 0,
  pagExtras: 0,
  pagTotal: 0,
  temPagamento: false,
};

// ======= Cálculo principal semanal =======
function calcular() {
  erroMensagemEl.textContent = "";
  let totalHorasSemana = 0;

  diasSemana.forEach((dia, index) => {
    const inicio = document.getElementById(`inicio-${index}`).value;
    const inicioInt = document.getElementById(`inicioInt-${index}`).value;
    const fimInt = document.getElementById(`fimInt-${index}`).value;
    const fim = document.getElementById(`fim-${index}`).value;

    let totalDiaHoras = 0;

    if (inicio && fim) {
      let inicioMin = horaParaMinutos(inicio);
      let fimMin = horaParaMinutos(fim);
      let inicioIntMin = inicioInt ? horaParaMinutos(inicioInt) : null;
      let fimIntMin = fimInt ? horaParaMinutos(fimInt) : null;

      if (fimMin < inicioMin) fimMin += 24 * 60;
      if (
        inicioIntMin !== null &&
        fimIntMin !== null &&
        fimIntMin < inicioIntMin
      ) {
        fimIntMin += 24 * 60;
      }

      const bruto = fimMin - inicioMin;
      const intervalo =
        inicioIntMin !== null && fimIntMin !== null
          ? fimIntMin - inicioIntMin
          : 0;

      let liquido = bruto - intervalo;
      if (liquido < 0) liquido = 0;

      totalDiaHoras = minutosParaDecimalHoras(liquido);
      totalHorasSemana += totalDiaHoras;
    }

    document.getElementById(`totalDia-${index}`).textContent =
      formatDecimal(totalDiaHoras);
  });

  totalHorasSemanaEl.textContent = formatDecimal(totalHorasSemana);

  const horasBase = parseFloat(
    document.getElementById("horasSemanaBase").value || "0"
  );
  const valorHoraStr = document.getElementById("valorHora").value.trim();
  const multiplicadorExtra = parseFloat(
    document.getElementById("multiplicadorExtra").value || "1"
  );
  const calcularPagamento = document.getElementById(
    "chkCalcularPagamento"
  ).checked;

  let horasExtras = 0;
  if (horasBase > 0) {
    horasExtras = Math.max(0, totalHorasSemana - horasBase);
  }
  horasExtrasBadgeEl.textContent = formatDecimal(horasExtras);

  ultimaSemana.totalHoras = totalHorasSemana;
  ultimaSemana.horasExtras = horasExtras;
  ultimaSemana.horasNormais = totalHorasSemana - horasExtras;
  ultimaSemana.pagNormais = 0;
  ultimaSemana.pagExtras = 0;
  ultimaSemana.pagTotal = 0;
  ultimaSemana.temPagamento = false;

  resumoPagamentoEl.textContent = "";

  if (calcularPagamento) {
    const valorHora = parseValorHora(valorHoraStr);
    if (isNaN(valorHora) || valorHora <= 0) {
      erroMensagemEl.textContent =
        "Para calcular o pagamento, informe um valor por hora válido (ex: 21,00).";
    } else {
      const horasNormais = ultimaSemana.horasNormais;
      const pagNormais = horasNormais * valorHora;
      const pagExtras = horasExtras * valorHora * multiplicadorExtra;
      const pagTotal = pagNormais + pagExtras;

      ultimaSemana.pagNormais = pagNormais;
      ultimaSemana.pagExtras = pagExtras;
      ultimaSemana.pagTotal = pagTotal;
      ultimaSemana.temPagamento = true;

      resumoPagamentoEl.innerHTML = `
            Horas normais: <strong>${formatDecimal(
              horasNormais
            )} h</strong> (${moedaBRL.format(pagNormais)})<br>
            Horas extras (${multiplicadorExtra
              .toString()
              .replace(".", ",")}x): <strong>${formatDecimal(
        horasExtras
      )} h</strong> (${moedaBRL.format(pagExtras)})<br><br>
            Total a receber na semana: <strong>${moedaBRL.format(
              pagTotal
            )}</strong>
          `;
    }
  }

  const nome = document.getElementById("nome").value.trim();
  nomeResumoEl.textContent = nome ? `Resumo de ${nome}` : "";

  saveState();
}

// ======= Botões semanais =======
document.getElementById("btnCalcular").addEventListener("click", calcular);

document.getElementById("btnReiniciar").addEventListener("click", () => {
  document
    .querySelectorAll('input[type="time"]')
    .forEach((inp) => (inp.value = ""));
  document.getElementById("horasSemanaBase").value = 44;
  document.getElementById("valorHora").value = "";
  document.getElementById("multiplicadorExtra").value = 1.5;
  totalHorasSemanaEl.textContent = "0.00";
  horasExtrasBadgeEl.textContent = "0.00";
  diasSemana.forEach((d, i) => {
    document.getElementById(`totalDia-${i}`).textContent = "0.00";
  });
  resumoPagamentoEl.textContent = "";
  erroMensagemEl.textContent = "";
  ultimaSemana = {
    totalHoras: 0,
    horasExtras: 0,
    horasNormais: 0,
    pagNormais: 0,
    pagExtras: 0,
    pagTotal: 0,
    temPagamento: false,
  };
  saveState();
});

// ======= Painel avançado =======
const chkMostrarAvancado = document.getElementById("chkMostrarAvancado");
const painelAvancado = document.getElementById("painelAvancado");
const toggleAvancado = document.getElementById("toggleAvancado");

function atualizarPainelAvancado() {
  painelAvancado.style.display = chkMostrarAvancado.checked ? "block" : "none";
}

chkMostrarAvancado.addEventListener("change", atualizarPainelAvancado);
toggleAvancado.addEventListener("click", (e) => {
  if (e.target.id === "chkMostrarAvancado") return;
  chkMostrarAvancado.checked = !chkMostrarAvancado.checked;
  atualizarPainelAvancado();
});

atualizarPainelAvancado();

// ======= RESUMO MENSAL =======
const tabelaMensalBody = document.querySelector("#tabelaMensal tbody");
const totalHorasMesEl = document.getElementById("totalHorasMes");
const totalExtrasMesEl = document.getElementById("totalExtrasMes");
const totalPagamentoMesEl = document.getElementById("totalPagamentoMes");
const resumoMensalTextoEl = document.getElementById("resumoMensalTexto");
const btnAdicionarMes = document.getElementById("btnAdicionarMes");

let semanasMes = [];
let editingSemanaIndex = null;

function atualizarTabelaMensal() {
  tabelaMensalBody.innerHTML = "";

  let totalHoras = 0;
  let totalExtras = 0;
  let totalPagamento = 0;

  semanasMes.forEach((sem, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${sem.periodo || "-"}</td>
          <td>${formatDecimal(sem.totalHoras)}</td>
          <td>${formatDecimal(sem.horasExtras)}</td>
          <td>${sem.temPagamento ? moedaBRL.format(sem.pagTotal) : "-"}</td>
          <td class="no-print">
            <button type="button" class="btn-secondary btn-xs btn-editar-semana" data-index="${idx}">Editar</button>
            <button type="button" class="btn-secondary btn-xs btn-excluir-semana" data-index="${idx}">Excluir</button>
          </td>
        `;
    tabelaMensalBody.appendChild(tr);

    totalHoras += sem.totalHoras;
    totalExtras += sem.horasExtras;
    if (sem.temPagamento) totalPagamento += sem.pagTotal;
  });

  totalHorasMesEl.textContent = formatDecimal(totalHoras);
  totalExtrasMesEl.textContent = formatDecimal(totalExtras);
  totalPagamentoMesEl.textContent =
    semanasMes.length && totalPagamento > 0
      ? moedaBRL.format(totalPagamento)
      : "-";

  if (semanasMes.length) {
    resumoMensalTextoEl.innerHTML =
      `Total de <strong>${formatDecimal(
        totalHoras
      )}</strong> horas trabalhadas no mês, ` +
      `<strong>${formatDecimal(totalExtras)}</strong> em horas extras.` +
      (totalPagamento > 0
        ? `<br>Total a receber no mês: <strong>${moedaBRL.format(
            totalPagamento
          )}</strong>.`
        : "");
  } else {
    resumoMensalTextoEl.textContent = "";
  }

  saveState();
}

btnAdicionarMes.addEventListener("click", () => {
  erroMensagemEl.textContent = "";
  calcular(); // garante cálculo atualizado

  if (!ultimaSemana || ultimaSemana.totalHoras <= 0) {
    erroMensagemEl.textContent =
      "Calcule ao menos uma semana com horas trabalhadas antes de adicionar ao mês.";
    return;
  }

  const dataInicio = document.getElementById("dataInicio").value;
  const dataFim = document.getElementById("dataFim").value;

  const semanaSnapshot = {
    dataInicio,
    dataFim,
    periodo: dataInicio && dataFim ? formatarPeriodo(dataInicio, dataFim) : "",
    totalHoras: ultimaSemana.totalHoras,
    horasExtras: ultimaSemana.horasExtras,
    pagTotal: ultimaSemana.pagTotal,
    temPagamento: ultimaSemana.temPagamento,
    valorHora: document.getElementById("valorHora").value.trim(),
    horasSemanaBase: document.getElementById("horasSemanaBase").value,
    multiplicadorExtra: document.getElementById("multiplicadorExtra").value,
    dias: diasSemana.map((dia, index) => ({
      inicio: document.getElementById(`inicio-${index}`).value,
      inicioInt: document.getElementById(`inicioInt-${index}`).value,
      fimInt: document.getElementById(`fimInt-${index}`).value,
      fim: document.getElementById(`fim-${index}`).value,
      totalDia: document.getElementById(`totalDia-${index}`).textContent,
    })),
  };

  if (editingSemanaIndex !== null) {
    semanasMes[editingSemanaIndex] = semanaSnapshot;
    editingSemanaIndex = null;
    btnAdicionarMes.textContent = "Adicionar semana ao mês";
  } else {
    semanasMes.push(semanaSnapshot);
  }

  atualizarTabelaMensal();
});

document.getElementById("btnLimparMes").addEventListener("click", () => {
  semanasMes = [];
  editingSemanaIndex = null;
  btnAdicionarMes.textContent = "Adicionar semana ao mês";
  atualizarTabelaMensal();
});

// delegação para botões Editar / Excluir
tabelaMensalBody.addEventListener("click", (e) => {
  const btn = e.target;
  if (btn.classList.contains("btn-excluir-semana")) {
    const idx = parseInt(btn.dataset.index, 10);
    semanasMes.splice(idx, 1);
    editingSemanaIndex = null;
    btnAdicionarMes.textContent = "Adicionar semana ao mês";
    atualizarTabelaMensal();
  } else if (btn.classList.contains("btn-editar-semana")) {
    const idx = parseInt(btn.dataset.index, 10);
    const sem = semanasMes[idx];
    if (!sem) return;

    document.getElementById("dataInicio").value = sem.dataInicio || "";
    document.getElementById("dataFim").value = sem.dataFim || "";
    document.getElementById("valorHora").value = sem.valorHora || "";
    document.getElementById("horasSemanaBase").value =
      sem.horasSemanaBase || "44";
    document.getElementById("multiplicadorExtra").value =
      sem.multiplicadorExtra || "1.5";

    if (sem.dias && sem.dias.length === diasSemana.length) {
      sem.dias.forEach((d, index) => {
        document.getElementById(`inicio-${index}`).value = d.inicio || "";
        document.getElementById(`inicioInt-${index}`).value = d.inicioInt || "";
        document.getElementById(`fimInt-${index}`).value = d.fimInt || "";
        document.getElementById(`fim-${index}`).value = d.fim || "";
      });
    }

    editingSemanaIndex = idx;
    btnAdicionarMes.textContent = "Salvar semana editada";

    calcular();
  }
});

// ======= EXPORTAR CSV =======
document.getElementById("btnExportarCSV").addEventListener("click", () => {
  calcular();

  let linhas = [];

  const funcionario = document.getElementById("nome").value.trim();
  const mesRef = document.getElementById("mesReferencia").value;

  linhas.push(`Funcionário;${funcionario || "---"}`);
  linhas.push(`Mês;${mesRef || "---"}`);
  linhas.push("");

  linhas.push("Tipo;Dia;Início;Início intervalo;Fim intervalo;Fim;TotalHoras");
  diasSemana.forEach((dia, index) => {
    const inicio = document.getElementById(`inicio-${index}`).value || "";
    const inicioInt = document.getElementById(`inicioInt-${index}`).value || "";
    const fimInt = document.getElementById(`fimInt-${index}`).value || "";
    const fim = document.getElementById(`fim-${index}`).value || "";
    const totalDia =
      document.getElementById(`totalDia-${index}`).textContent || "0.00";
    linhas.push(
      `Semana;${dia};${inicio};${inicioInt};${fimInt};${fim};${totalDia}`
    );
  });

  linhas.push("");
  linhas.push("Tipo;Semana;Período;HorasTotais;HorasExtras;Pagamento");
  semanasMes.forEach((sem, idx) => {
    const pagamento = sem.temPagamento
      ? sem.pagTotal.toFixed(2).replace(".", ",")
      : "";
    linhas.push(
      `Mês;${idx + 1};${sem.periodo};${formatDecimal(
        sem.totalHoras
      )};${formatDecimal(sem.horasExtras)};${pagamento}`
    );
  });

  const csvConteudo = linhas.join("\r\n");
  const blob = new Blob([csvConteudo], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  const nomeArquivo = `no_jardim_horas_${mesRef || "sem_mes"}.csv`;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

// ======= IMPRESSÃO COMPLETA =======
document.getElementById("btnImprimir").addEventListener("click", () => {
  document.body.classList.remove("modo-pdf");
  window.print();
});

// ======= PDF RESUMIDO (SEMANA/MÊS) =======
document.getElementById("btnPdf").addEventListener("click", () => {
  calcular();
  atualizarTabelaMensal();

  let totalHoras = 0;
  let totalExtras = 0;
  let totalPagamento = 0;

  semanasMes.forEach((sem) => {
    totalHoras += sem.totalHoras;
    totalExtras += sem.horasExtras;
    if (sem.temPagamento) totalPagamento += sem.pagTotal;
  });

  const funcionario =
    document.getElementById("nome").value.trim() || "________________";
  const mesRef = document.getElementById("mesReferencia").value;
  let mesFormatado = "";
  if (mesRef) {
    const [ano, mes] = mesRef.split("-");
    mesFormatado = `${mes}/${ano}`;
  }

  let linhasSemanas = "";
  if (semanasMes.length) {
    linhasSemanas = semanasMes
      .map(
        (sem, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${sem.periodo || "-"}</td>
            <td>${formatDecimal(sem.totalHoras)}</td>
            <td>${formatDecimal(sem.horasExtras)}</td>
            <td>${sem.temPagamento ? moedaBRL.format(sem.pagTotal) : "-"}</td>
          </tr>`
      )
      .join("");
  } else {
    linhasSemanas = `
          <tr>
            <td colspan="5">Nenhuma semana adicionada.</td>
          </tr>`;
  }

  pdfContainer.innerHTML = `
        <div id="pdfHeader">
          <h1>NO JARDIM</h1>
          <h2>resto bar</h2>
        </div>
        <div id="pdfInfo">
          <span><strong>Funcionário:</strong> ${funcionario}</span>
          <span><strong>Mês ref.:</strong> ${mesFormatado || "________"}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Semana</th>
              <th>Período</th>
              <th>Horas totais</th>
              <th>Horas extras</th>
              <th>Pagamento</th>
            </tr>
          </thead>
          <tbody>
            ${linhasSemanas}
          </tbody>
        </table>

        <div id="pdfResumoTotais">
          <strong>Total mês:</strong>
          ${formatDecimal(totalHoras)} h |
          Extras: ${formatDecimal(totalExtras)} h
          ${
            totalPagamento > 0
              ? `| Valor: ${moedaBRL.format(totalPagamento)}`
              : ""
          }
        </div>
      `;

  document.body.classList.add("modo-pdf");
  window.print();
  setTimeout(() => {
    document.body.classList.remove("modo-pdf");
  }, 500);
});

// ======= LOCALSTORAGE (salvar / restaurar) =======
function saveState() {
  const state = {
    nome: document.getElementById("nome").value,
    valorHora: document.getElementById("valorHora").value,
    dataInicio: document.getElementById("dataInicio").value,
    dataFim: document.getElementById("dataFim").value,
    mesReferencia: document.getElementById("mesReferencia").value,
    horasSemanaBase: document.getElementById("horasSemanaBase").value,
    multiplicadorExtra: document.getElementById("multiplicadorExtra").value,
    chkCalcularPagamento: document.getElementById("chkCalcularPagamento")
      .checked,
    chkMostrarAvancado: chkMostrarAvancado.checked,
    semanaInputs: diasSemana.map((d, index) => ({
      inicio: document.getElementById(`inicio-${index}`).value,
      inicioInt: document.getElementById(`inicioInt-${index}`).value,
      fimInt: document.getElementById(`fimInt-${index}`).value,
      fim: document.getElementById(`fim-${index}`).value,
    })),
    semanasMes,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ======= MODAL DIAS DO MÊS (CONTROLE DIÁRIO) =======
const modalDiasMes = document.getElementById("modalDiasMes");
const btnDiasMes = document.getElementById("btnDiasMes");
const btnFecharModalDiasMes = document.getElementById("btnFecharModalDiasMes");
const tabelaDiasMesBody = document.querySelector("#tabelaDiasMes tbody");
const totalHorasDiasMesEl = document.getElementById("totalHorasDiasMes");
const mesDiasReferenciaEl = document.getElementById("mesDiasReferencia");
const valorHoraMesEl = document.getElementById("valorHoraMes");
const nomeFuncionarioMesEl = document.getElementById("nomeFuncionarioMes");
const btnCalcularDiasMes = document.getElementById("btnCalcularDiasMes");
const btnLimparDiasMes = document.getElementById("btnLimparDiasMes");
const btnPdfDiasMes = document.getElementById("btnPdfDiasMes");

let diasMesAtual = 31;

// abre o modal
if (btnDiasMes) {
  btnDiasMes.addEventListener("click", () => {
    // copia dados da tela principal, se existirem
    const nomePrincipal = document.getElementById("nome").value.trim();
    if (
      nomePrincipal &&
      nomeFuncionarioMesEl &&
      !nomeFuncionarioMesEl.value.trim()
    ) {
      nomeFuncionarioMesEl.value = nomePrincipal;
    }

    const mesRefPrincipal = document.getElementById("mesReferencia").value;
    if (mesRefPrincipal && mesDiasReferenciaEl && !mesDiasReferenciaEl.value) {
      mesDiasReferenciaEl.value = mesRefPrincipal;
    }

    const valorHoraPrincipal = document
      .getElementById("valorHora")
      .value.trim();
    if (valorHoraPrincipal && valorHoraMesEl && !valorHoraMesEl.value.trim()) {
      valorHoraMesEl.value = valorHoraPrincipal;
    }

    gerarTabelaDiasMes();
    modalDiasMes.classList.add("open");
  });
}

// fecha o modal
if (btnFecharModalDiasMes) {
  btnFecharModalDiasMes.addEventListener("click", () => {
    modalDiasMes.classList.remove("open");
  });
}

// fecha clicando fora do conteúdo (no fundo escuro)
if (modalDiasMes) {
  modalDiasMes.addEventListener("click", (e) => {
    if (e.target === modalDiasMes) {
      modalDiasMes.classList.remove("open");
    }
  });
}

// quando trocar o mês, ajusta quantidade de dias
if (mesDiasReferenciaEl) {
  mesDiasReferenciaEl.addEventListener("change", () => {
    gerarTabelaDiasMes();
  });
}

// gera as linhas da tabela conforme o mês escolhido
function gerarTabelaDiasMes() {
  if (!tabelaDiasMesBody) return;

  let diasNoMes = 31;
  const mesRef = mesDiasReferenciaEl ? mesDiasReferenciaEl.value : "";

  if (mesRef) {
    const [anoStr, mesStr] = mesRef.split("-");
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10); // 1-12
    if (!isNaN(ano) && !isNaN(mes)) {
      // new Date(ano, mes, 0) retorna o último dia do mês
      diasNoMes = new Date(ano, mes, 0).getDate();
    }
  }

  diasMesAtual = diasNoMes;
  tabelaDiasMesBody.innerHTML = "";

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const idx = dia - 1;
    const diaLabel = String(dia).padStart(2, "0");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="day-label">${diaLabel}</td>
      <td><input type="time" id="inicioMes-${idx}"></td>
      <td><input type="time" id="inicioIntMes-${idx}"></td>
      <td><input type="time" id="fimIntMes-${idx}"></td>
      <td><input type="time" id="fimMes-${idx}"></td>
      <td id="totalDiaMes-${idx}">0.00</td>
    `;
    tabelaDiasMesBody.appendChild(tr);
  }

  if (totalHorasDiasMesEl) totalHorasDiasMesEl.textContent = "0.00";
}

// cálculo das horas por dia do mês
function calcularDiasDoMes() {
  if (!totalHorasDiasMesEl) return 0;

  let totalHorasMes = 0;

  for (let idx = 0; idx < diasMesAtual; idx++) {
    const inicio = document.getElementById(`inicioMes-${idx}`)?.value;
    const inicioInt = document.getElementById(`inicioIntMes-${idx}`)?.value;
    const fimInt = document.getElementById(`fimIntMes-${idx}`)?.value;
    const fim = document.getElementById(`fimMes-${idx}`)?.value;

    let totalDiaHoras = 0;

    if (inicio && fim) {
      let inicioMin = horaParaMinutos(inicio);
      let fimMin = horaParaMinutos(fim);
      let inicioIntMin = inicioInt ? horaParaMinutos(inicioInt) : null;
      let fimIntMin = fimInt ? horaParaMinutos(fimInt) : null;

      if (fimMin < inicioMin) fimMin += 24 * 60;
      if (
        inicioIntMin !== null &&
        fimIntMin !== null &&
        fimIntMin < inicioIntMin
      ) {
        fimIntMin += 24 * 60;
      }

      const bruto = fimMin - inicioMin;
      const intervalo =
        inicioIntMin !== null && fimIntMin !== null
          ? fimIntMin - inicioIntMin
          : 0;

      let liquido = bruto - intervalo;
      if (liquido < 0) liquido = 0;

      totalDiaHoras = minutosParaDecimalHoras(liquido);
      totalHorasMes += totalDiaHoras;
    }

    const celulaTotalDia = document.getElementById(`totalDiaMes-${idx}`);
    if (celulaTotalDia) {
      celulaTotalDia.textContent = formatDecimal(totalDiaHoras);
    }
  }

  totalHorasDiasMesEl.textContent = formatDecimal(totalHorasMes);
  return totalHorasMes;
}

// botão calcular dentro do modal
if (btnCalcularDiasMes) {
  btnCalcularDiasMes.addEventListener("click", () => {
    calcularDiasDoMes();
  });
}

// botão limpar dentro do modal
if (btnLimparDiasMes) {
  btnLimparDiasMes.addEventListener("click", () => {
    for (let idx = 0; idx < diasMesAtual; idx++) {
      const campos = [
        `inicioMes-${idx}`,
        `inicioIntMes-${idx}`,
        `fimIntMes-${idx}`,
        `fimMes-${idx}`,
      ];
      campos.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      const celula = document.getElementById(`totalDiaMes-${idx}`);
      if (celula) celula.textContent = "0.00";
    }
    if (totalHorasDiasMesEl) totalHorasDiasMesEl.textContent = "0.00";
  });
}

// ======= PDF RESUMIDO DOS DIAS DO MÊS =======
if (btnPdfDiasMes) {
  btnPdfDiasMes.addEventListener("click", () => {
    const totalHorasMes = calcularDiasDoMes();

    // funcionário
    let funcionario =
      (nomeFuncionarioMesEl && nomeFuncionarioMesEl.value.trim()) || "";
    if (!funcionario) {
      funcionario =
        document.getElementById("nome").value.trim() || "________________";
    }

    // mês de referência
    let mesRef = mesDiasReferenciaEl ? mesDiasReferenciaEl.value : "";
    let mesFormatado = "";
    if (mesRef) {
      const [ano, mes] = mesRef.split("-");
      mesFormatado = `${mes}/${ano}`;
    } else {
      const mesPrincipal = document.getElementById("mesReferencia").value;
      if (mesPrincipal) {
        const [ano, mes] = mesPrincipal.split("-");
        mesFormatado = `${mes}/${ano}`;
      }
    }

    const valorHoraStr = valorHoraMesEl ? valorHoraMesEl.value.trim() : "";
    const valorHora = parseValorHora(valorHoraStr);
    let totalPagamentoMes = 0;
    if (!isNaN(valorHora) && valorHora > 0) {
      totalPagamentoMes = totalHorasMes * valorHora;
    }

    // linhas da tabela: um dia por linha
    let linhasDias = "";
    for (let idx = 0; idx < diasMesAtual; idx++) {
      const dia = String(idx + 1).padStart(2, "0");
      const totalDia =
        document.getElementById(`totalDiaMes-${idx}`)?.textContent || "0.00";

      linhasDias += `
        <tr>
          <td>${dia}</td>
          <td>${totalDia}</td>
        </tr>
      `;
    }

    if (!linhasDias.trim()) {
      linhasDias = `
        <tr>
          <td colspan="2">Nenhum lançamento de horas para este mês.</td>
        </tr>
      `;
    }

    pdfContainer.innerHTML = `
      <div id="pdfHeader">
        <h1>NO JARDIM</h1>
        <h2>resto bar</h2>
      </div>
      <div id="pdfInfo">
        <span><strong>Funcionário:</strong> ${funcionario}</span>
        <span><strong>Mês ref.:</strong> ${mesFormatado || "________"}</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Dia</th>
            <th>Horas trabalhadas</th>
          </tr>
        </thead>
        <tbody>
          ${linhasDias}
        </tbody>
      </table>

      <div id="pdfResumoTotais">
        <strong>Total mês:</strong>
        ${formatDecimal(totalHorasMes)} h
        ${
          totalPagamentoMes > 0
            ? ` | Valor: ${moedaBRL.format(totalPagamentoMes)}`
            : ""
        }
      </div>
    `;

    document.body.classList.add("modo-pdf");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("modo-pdf");
    }, 500);
  });
}

// ======= LOADSTATE =======
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  let state;
  try {
    state = JSON.parse(raw);
  } catch {
    return;
  }
  if (!state) return;

  document.getElementById("nome").value = state.nome || "";
  document.getElementById("valorHora").value = state.valorHora || "";
  document.getElementById("dataInicio").value = state.dataInicio || "";
  document.getElementById("dataFim").value = state.dataFim || "";
  document.getElementById("mesReferencia").value = state.mesReferencia || "";
  document.getElementById("horasSemanaBase").value =
    state.horasSemanaBase || "44";
  document.getElementById("multiplicadorExtra").value =
    state.multiplicadorExtra || "1.5";
  document.getElementById("chkCalcularPagamento").checked =
    state.chkCalcularPagamento ?? true;
  chkMostrarAvancado.checked = state.chkMostrarAvancado ?? false;
  atualizarPainelAvancado();

  if (state.semanaInputs && state.semanaInputs.length === diasSemana.length) {
    state.semanaInputs.forEach((d, index) => {
      document.getElementById(`inicio-${index}`).value = d.inicio || "";
      document.getElementById(`inicioInt-${index}`).value = d.inicioInt || "";
      document.getElementById(`fimInt-${index}`).value = d.fimInt || "";
      document.getElementById(`fim-${index}`).value = d.fim || "";
    });
  }

  semanasMes = Array.isArray(state.semanasMes) ? state.semanasMes : [];
  atualizarTabelaMensal();
  calcular();
}

// salva sempre que mudar algum input
document.querySelectorAll("input").forEach((inp) => {
  inp.addEventListener("input", () => saveState());
  inp.addEventListener("change", () => saveState());
});

// carrega estado inicial
loadState();
("");
