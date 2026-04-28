class Dashboard {
    constructor() {
        const { MOCK_DATA, DATA } = window.DashboardData;
        this.MOCK_DATA = MOCK_DATA;
        this.DATA = DATA;

        console.log("Dashboard Initializing with data:", window.DashboardData);
        this.selectedMonth = "enero-2026"; // Set default to January as requested
        this.selectedAreas = [];
        this.selectedCompanies = [];
        this.searchQuery = "";
        this.matrixShowPercent = false;
        this.activeKpiId = "ventas";
        this.activeView = "charts"; // 'charts', 'detalle', 'matriz', 'variaciones'
        this.comparisonMode = "budget"; // 'budget', 'prev_month'

        this.charts = {
            evolucionArea: null,
            evolucionSociedad: null,
            evolucionMesesArea: null,
            evolucionMesesSociedad: null,
        };

        this.init();
    }

    init() {
        this.renderFilters();
        this.attachEventListeners();
        document.addEventListener("DOMContentLoaded", () => {
            this.fetchSPFolders();
        });
        //this.fetchSPFolders(); // Empezar a buscar las carpetas en SP nada más cargar
        this.update();
    }

    renderFilters() {
        // Month Filter
        const monthSelect = document.getElementById('monthFilter');
        this.MOCK_DATA.months.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = month;
            if (month === this.selectedMonth) option.selected = true;
            monthSelect.appendChild(option);
        });

        // Area Filter
        const areaContainer = document.getElementById('areaFilter');
        this.MOCK_DATA.areas.forEach(area => {
            const item = document.createElement('div');
            item.className = 'checkbox-item';
            item.innerHTML = `<input type="checkbox" value="${area.name}"> <span>${area.name}</span>`;
            item.onclick = (e) => {
                const cb = item.querySelector('input');
                if (e.target !== cb) cb.checked = !cb.checked;
                this.toggleArea(area.name, cb.checked);
                item.classList.toggle('active', cb.checked);
            };
            areaContainer.appendChild(item);
        });

        this.renderCompanyFilter();
    }

    renderCompanyFilter() {
        const container = document.getElementById('companyFilter');
        container.innerHTML = "";

        const filteredCompanies = [];
        this.MOCK_DATA.areas.forEach(area => {
            if (this.selectedAreas.length === 0 || this.selectedAreas.includes(area.name)) {
                area.companies.forEach(company => {
                    if (company.toLowerCase().includes(this.searchQuery.toLowerCase())) {
                        filteredCompanies.push(company);
                    }
                });
            }
        });

        filteredCompanies.forEach(company => {
            const item = document.createElement('div');
            item.className = 'checkbox-item';
            if (this.selectedCompanies.includes(company)) item.classList.add('active');
            item.innerHTML = `<input type="checkbox" value="${company}" ${this.selectedCompanies.includes(company) ? 'checked' : ''}> <span>${company}</span>`;
            item.onclick = (e) => {
                const cb = item.querySelector('input');
                if (e.target !== cb) cb.checked = !cb.checked;
                this.toggleCompany(company, cb.checked);
                item.classList.toggle('active', cb.checked);
            };
            container.appendChild(item);
        });
    }

    toggleArea(areaName, isChecked) {
        if (isChecked) this.selectedAreas.push(areaName);
        else this.selectedAreas = this.selectedAreas.filter(a => a !== areaName);
        this.renderCompanyFilter();
        this.update();
    }

    toggleCompany(companyName, isChecked) {
        if (isChecked) this.selectedCompanies.push(companyName);
        else this.selectedCompanies = this.selectedCompanies.filter(c => c !== companyName);
        this.update();
    }

    attachEventListeners() {
        // File Upload (ahora gestionado nativamente por fetchSPFolders / SP)
        document.getElementById('monthFilter').addEventListener('change', (e) => {
            this.selectedMonth = e.target.value;
            this.update();
        });

        document.getElementById('companySearch').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderCompanyFilter();
        });

        const toggleBtn = document.getElementById('matrixToggleBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.matrixShowPercent = !this.matrixShowPercent;
                toggleBtn.textContent = this.matrixShowPercent ? 'Mostrar Valores Absolutos' : 'Mostrar Desviación %';
                this.update();
            });
        }

        // Setup KPI interactivity
        document.querySelectorAll('.kpi-card').forEach(card => {
            card.addEventListener('click', () => {
                const kpiId = card.id.replace('kpi-', '');
                this.activeKpiId = kpiId;
                this.activeView = 'charts'; // Forzar vista de gráficas
                this.updateViewVisibility();
                this.update();
            });
        });

        // Setup View Toggles
        document.getElementById('btn-show-evoluc-sociedad').addEventListener('click', () => {
            this.activeView = 'charts';
            this.updateViewVisibility();
        });
        document.getElementById('btn-show-evoluc-meses').addEventListener('click', () => {
            this.activeView = 'charts-meses';
            this.updateViewVisibility();
            this.update();
        });
        document.getElementById('btn-show-detalle').addEventListener('click', () => {
            this.activeView = 'detalle';
            this.updateViewVisibility();
        });
        document.getElementById('btn-show-matriz').addEventListener('click', () => {
            this.activeView = 'matriz';
            this.updateViewVisibility();
        });
        document.getElementById('btn-show-variaciones').addEventListener('click', () => {
            this.activeView = 'variaciones';
            this.updateViewVisibility();
        });

        // Comparison Toggles
        const btnCompPpto = document.getElementById('btn-comp-ppto');
        const btnCompPrev = document.getElementById('btn-comp-prev');
        if (btnCompPpto && btnCompPrev) {
            btnCompPpto.addEventListener('click', () => {
                this.comparisonMode = 'budget';
                btnCompPpto.classList.add('active');
                btnCompPpto.style.background = 'var(--primary)';
                btnCompPpto.style.color = 'white';
                btnCompPrev.classList.remove('active');
                btnCompPrev.style.background = 'transparent';
                btnCompPrev.style.color = 'var(--text)';
                this.update();
            });
            btnCompPrev.addEventListener('click', () => {
                this.comparisonMode = 'prev_month';
                btnCompPrev.classList.add('active');
                btnCompPrev.style.background = 'var(--primary)';
                btnCompPrev.style.color = 'white';
                btnCompPpto.classList.remove('active');
                btnCompPpto.style.background = 'transparent';
                btnCompPpto.style.color = 'var(--text)';
                this.update();
            });
        }
    }

    updateViewVisibility() {
        // Hide all
        document.getElementById('view-charts').style.display = 'none';
        document.getElementById('view-charts-meses').style.display = 'none';
        document.getElementById('view-table-detalle').style.display = 'none';
        document.getElementById('view-table-matriz').style.display = 'none';
        document.getElementById('view-table-variaciones').style.display = 'none';

        // Show active
        if (this.activeView === 'charts') {
            document.getElementById('view-charts').style.display = 'grid';
        } else if (this.activeView === 'charts-meses') {
            document.getElementById('view-charts-meses').style.display = 'grid';
        } else if (this.activeView === 'detalle') {
            document.getElementById('view-table-detalle').style.display = 'block';
        } else if (this.activeView === 'matriz') {
            document.getElementById('view-table-matriz').style.display = 'block';
        } else if (this.activeView === 'variaciones') {
            document.getElementById('view-table-variaciones').style.display = 'block';
        }

        // Update button active states
        document.getElementById('btn-show-evoluc-sociedad').classList.toggle('active', this.activeView === 'charts');
        document.getElementById('btn-show-evoluc-meses').classList.toggle('active', this.activeView === 'charts-meses');
        document.getElementById('btn-show-detalle').classList.toggle('active', this.activeView === 'detalle');
        document.getElementById('btn-show-matriz').classList.toggle('active', this.activeView === 'matriz');
        document.getElementById('btn-show-variaciones').classList.toggle('active', this.activeView === 'variaciones');
    }

    getMetricValue(comps, datasetStr, monthOrBudget) {
        let sumNominal = 0;
        let sumVentas = 0;
        let sumMargen = 0;
        let sumEstructura = 0;

        comps.forEach(comp => {
            let dataObj = datasetStr === 'budget'
                ? (this.DATA.budget[comp] || {})
                : (this.DATA.actuals[comp] && this.DATA.actuals[comp][monthOrBudget] ? this.DATA.actuals[comp][monthOrBudget] : {});

            const v = (dataObj.ventas || 0) + (dataObj.ventas_intragrupo || 0);

            if (this.activeKpiId === 'ventas') { sumNominal += v; }
            else if (this.activeKpiId === 'rai') { sumNominal += (dataObj.margen_antes_impuestos || 0); }
            else if (this.activeKpiId === 'ebitda') { sumNominal += (dataObj.ebitda_sin_gerenciamiento || 0); }
            else if (this.activeKpiId === 'costes-estructura') { sumNominal += (dataObj.estructura || 0); }
            else if (this.activeKpiId === 'variables') { sumNominal += (dataObj.variables || 0); }
            else if (this.activeKpiId === 'fidelizacion') { sumNominal += (dataObj.fidelizacion || 0); }
            else if (this.activeKpiId === 'margen') { sumMargen += (dataObj.margen_bruto || 0); sumVentas += v; }
            else if (this.activeKpiId === 'peso-estructura') { sumEstructura += (dataObj.estructura || 0); sumVentas += v; }
        });

        if (this.activeKpiId === 'margen') {
            return sumVentas !== 0 ? (sumMargen / Math.abs(sumVentas)) * 100 : 0;
        } else if (this.activeKpiId === 'peso-estructura') {
            return sumVentas !== 0 ? (sumEstructura / Math.abs(sumVentas)) * 100 : 0;
        } else {
            return sumNominal;
        }
    }

    getFilteredData() {
        let companiesToSum = [];
        if (this.selectedCompanies.length > 0) {
            companiesToSum = this.selectedCompanies;
        } else if (this.selectedAreas.length > 0) {
            this.MOCK_DATA.areas.filter(a => this.selectedAreas.includes(a.name)).forEach(a => {
                companiesToSum.push(...a.companies);
            });
        } else {
            // Aggregate mathematically all companies explicitly returned by the Excel file
            const allActuals = Object.keys(this.DATA.actuals);
            const allBudgets = Object.keys(this.DATA.budget);
            
            // Exclude Mock Data subtotals (to avoid 3x visual inflation if running on unuploaded data)
            const excludedNodes = ["TOTAL_GRUPO", "GTM Servicios Industriales", "GTM Construcción", "GTM Latam", "Participadas"];
            
            companiesToSum = [...new Set([...allActuals, ...allBudgets])].filter(c => !excludedNodes.includes(c));
        }

        const totals = { budget: {}, actual: {} };
        this.MOCK_DATA.indicators.forEach(ind => {
            totals.budget[ind.id] = 0;
            totals.actual[ind.id] = 0;
        });

        const dataMonths = this.MOCK_DATA.months;
        const currMIdx = dataMonths.indexOf(this.selectedMonth);
        const prevMonth = currMIdx > 0 ? dataMonths[currMIdx - 1] : null;

        companiesToSum.forEach(comp => {
            this.MOCK_DATA.indicators.forEach(ind => {
                let bVal = 0;
                if (this.comparisonMode === 'budget') {
                    bVal = this.DATA.budget[comp] ? this.DATA.budget[comp][ind.id] : 0;
                } else {
                    if (prevMonth && this.DATA.actuals[comp] && this.DATA.actuals[comp][prevMonth]) {
                        bVal = this.DATA.actuals[comp][prevMonth][ind.id] || 0;
                    }
                }
                totals.budget[ind.id] += (bVal || 0); // "budget" key here acts as the dynamic baseline

                if (this.DATA.actuals[comp] && this.DATA.actuals[comp][this.selectedMonth]) {
                    const aVal = this.DATA.actuals[comp][this.selectedMonth][ind.id];
                    totals.actual[ind.id] += (aVal || 0);
                }
            });
        });

        console.log(`Filtered data for ${this.selectedMonth}:`, totals);
        return { totals, companies: companiesToSum };
    }

    formatEuro(value, decimals = 2) {
        if (value === undefined || value === null || isNaN(value)) return '0,00';
        return new Intl.NumberFormat('de-DE', { 
            minimumFractionDigits: decimals, 
            maximumFractionDigits: decimals,
            useGrouping: true 
        }).format(value / 1000);
    }

    formatPercent(value, decimals = 2) {
        if (value === undefined || value === null || isNaN(value)) return '0,00';
        return new Intl.NumberFormat('de-DE', { 
            minimumFractionDigits: decimals, 
            maximumFractionDigits: decimals,
            useGrouping: true 
        }).format(value);
    }

    update() {
        const { totals, companies } = this.getFilteredData();

        // Update Breadcrumb
        document.getElementById('currentAreaName').textContent = this.selectedAreas.length === 1 ? this.selectedAreas[0] : (this.selectedAreas.length > 1 ? "Varias Áreas" : "Grupo Agregado");
        document.getElementById('currentCompanyName').textContent = this.selectedCompanies.length === 1 ? this.selectedCompanies[0] : (this.selectedCompanies.length > 1 ? "Varias Sociedades" : "Todas las Sociedades");
        document.getElementById('selectedMonthDisplay').textContent = `${this.selectedMonth} 2026`;

        this.updateKPIs(totals);
        this.updateCharts(totals, companies);
        this.updateTables(totals, companies);
        this.generateInsights(totals, companies);
    }

    updateKPIs(totals) {
        const updateKPI = (id, actual, budget, type) => {
            const card = document.getElementById(`kpi-${id}`);
            if (!card) return;
            const valEl = card.querySelector('.kpi-value');
            const trendEl = card.querySelector('.kpi-trend');
            const trendIcon = card.querySelector('.trend-icon');
            const trendVal = card.querySelector('.trend-value');
            const subAbsEl = card.querySelector('.kpi-sub-abs');
            const subLabelEl = card.querySelector('.kpi-sub');

            const baselineLabel = this.comparisonMode === 'budget' ? 'vs Presupuesto' : 'vs Mes anterior';

            if (subLabelEl && subLabelEl.textContent.startsWith('vs ')) {
                subLabelEl.textContent = baselineLabel;
            }

            let deviationPct = 0;
            if (budget !== 0) deviationPct = ((actual - budget) / Math.abs(budget)) * 100;

            let deviationAbs = actual - budget;

            if (type === 'ratio') {
                valEl.textContent = `${this.formatPercent(actual)}%`;
            } else if (id === 'peso-estructura') {
                valEl.textContent = `${this.formatPercent(Math.abs(actual))}%`;
            } else {
                valEl.textContent = `${this.formatEuro(actual, 0)}k€`;
            }

            const isPositive = deviationAbs > 0;
            let favorable = isPositive;
            if (type === 'expense') favorable = !isPositive;

            if (trendEl) {
                trendEl.className = `kpi-trend ${favorable ? 'positive' : 'negative'}`;
            }
            if (trendIcon) {
                trendIcon.textContent = isPositive ? '↑' : '↓';
            }
            if (trendVal) {
                trendVal.textContent = `${Math.abs(deviationPct).toFixed(2).replace('.', ',')}%`;
            }

            if (subAbsEl) {
                if (id === 'peso-estructura' || id === 'margen') {
                    if (subLabelEl) {
                        subLabelEl.style.display = 'inline';
                        subLabelEl.textContent = baselineLabel;
                    }
                    const refTxt = this.comparisonMode === 'budget' ? 'Ppto' : 'Mes ant.';
                    subAbsEl.textContent = `Ref: ${this.formatPercent(budget)}% (${refTxt})`;
                    subAbsEl.className = `kpi-sub-abs`;
                    subAbsEl.style.color = '#1e293b';
                    subAbsEl.style.display = 'block';
                    subAbsEl.style.marginTop = '4px';
                } else {
                    if (subLabelEl) {
                        subLabelEl.style.display = 'inline';
                        subLabelEl.textContent = baselineLabel;
                    }
                    subAbsEl.textContent = `${deviationAbs > 0 ? '+' : ''}${this.formatEuro(deviationAbs, 0)}k€`;
                    subAbsEl.className = `kpi-sub-abs ${favorable ? 'text-success' : 'text-danger'}`;
                    subAbsEl.style.color = '';
                    subAbsEl.style.display = 'inline';
                    subAbsEl.style.marginTop = '0';
                }
            }
        };

        const ventasActual = (totals.actual.ventas || 0) + (totals.actual.ventas_intragrupo || 0);
        const ventasBudget = (totals.budget.ventas || 0) + (totals.budget.ventas_intragrupo || 0);

        const margenReal = ventasActual !== 0 ? (totals.actual.margen_bruto / ventasActual) * 100 : 0;
        const margenBud = ventasBudget !== 0 ? (totals.budget.margen_bruto / ventasBudget) * 100 : 0;

        const estReal = ventasActual !== 0 ? (totals.actual.estructura / ventasActual) * 100 : 0;
        const estBud = ventasBudget !== 0 ? (totals.budget.estructura / ventasBudget) * 100 : 0;

        // Fila 1
        updateKPI('rai', totals.actual.margen_antes_impuestos || 0, totals.budget.margen_antes_impuestos || 0, 'profit');
        updateKPI('ebitda', totals.actual.ebitda_sin_gerenciamiento || 0, totals.budget.ebitda_sin_gerenciamiento || 0, 'profit');
        updateKPI('margen', margenReal, margenBud, 'ratio');
        updateKPI('ventas', ventasActual, ventasBudget, 'income');

        // Fila 2
        updateKPI('costes-estructura', totals.actual.estructura || 0, totals.budget.estructura || 0, 'expense');
        updateKPI('peso-estructura', estReal, estBud, 'expense');
        updateKPI('variables', totals.actual.variables || 0, totals.budget.variables || 0, 'expense');
        updateKPI('fidelizacion', totals.actual.fidelizacion || 0, totals.budget.fidelizacion || 0, 'expense');

        document.querySelectorAll('.kpi-card').forEach(card => {
            card.classList.toggle('active', card.id === `kpi-${this.activeKpiId}`);
        });

        const pesoEstSubEl = document.getElementById('peso-estructura-budget');
        if (pesoEstSubEl) {
            pesoEstSubEl.textContent = `Ppto ref: ${Math.abs(estBud).toFixed(2)}%`;
            pesoEstSubEl.className = "kpi-sub-abs";
        }
    }

    updateCharts(totals, companies) {
        this.renderEvolucion(totals, companies, true);  // Área
        this.renderEvolucion(totals, companies, false); // Sociedad
        if (this.activeView === 'charts-meses') {
            this.renderEvolucionMeses(companies, true);
            this.renderEvolucionMeses(companies, false);
        }
    }

    renderEvolucionMeses(companies, isByArea) {
        const chartId = isByArea ? 'evolucionMesesAreaChart' : 'evolucionMesesSociedadChart';
        const chartKey = isByArea ? 'evolucionMesesArea' : 'evolucionMesesSociedad';
        const ctx = document.getElementById(chartId);
        if (!ctx) return;

        if (this.charts[chartKey]) this.charts[chartKey].destroy();

        // Months that have any real data
        const populatedMonths = this.MOCK_DATA.months.filter(m =>
            Object.values(this.DATA.actuals).some(cData =>
                cData && cData[m] && Object.values(cData[m]).some(v => v !== 0 && !Number.isNaN(v))
            )
        );
        // Trim array up to the globally selected month
        let monthsToShow = populatedMonths.length > 0 ? populatedMonths : this.MOCK_DATA.months.slice(0, 1);
        const selIdx = monthsToShow.indexOf(this.selectedMonth);
        if (selIdx !== -1) {
            monthsToShow = monthsToShow.slice(0, selIdx + 1);
        }

        // If 'Contra mes anterior' is active, only show at most the last two YTD YTD months
        if (this.comparisonMode === 'prev_month') {
            monthsToShow = monthsToShow.slice(-2);
        }

        // All relevant company codes
        const allComps = isByArea
            ? this.MOCK_DATA.areas.reduce((acc, a) => acc.concat(a.companies.filter(c => companies.includes(c))), [])
            : companies;

        // Total real value per month (sum across all entities)
        const realData = monthsToShow.map(m =>
            allComps.reduce((sum, c) => sum + this.getMetricValue([c], 'actual', m), 0)
        );

        // Baseline ALWAYS represents Budget in this specific chart as requested
        const baselineLabel = 'Presupuesto';
        const budgetTotal = allComps.reduce((sum, c) => sum + this.getMetricValue([c], 'budget', null), 0);

        const isPercent = this.activeKpiId === 'margen' || this.activeKpiId === 'peso-estructura';
        const groupLabel = isByArea ? 'Área' : 'Sociedad';
        const kpiTitles = {
            'ventas': 'Ventas Totales', 'rai': 'Rtdo. Antes Impuestos',
            'ebitda': 'EBITDA (sin gerenc.)', 'margen': 'Margen Bruto (%)',
            'costes-estructura': 'Costes de Estructura', 'peso-estructura': 'Peso Estructura (%)',
            'variables': 'Variables', 'fidelizacion': 'Planes de Fidelización'
        };
        const titleEl = document.getElementById(isByArea ? 'meses-area-title' : 'meses-sociedad-title');
        if (titleEl) titleEl.textContent = `Evolución por Meses — ${kpiTitles[this.activeKpiId] || 'KPI'} (Total por ${groupLabel})`;

        // One bar dataset (total) + hidden baseline for plugin
        const datasets = [
            {
                label: 'Real',
                data: realData,
                backgroundColor: '#22c55e',
                borderRadius: 4,
                barPercentage: 0.6,
                categoryPercentage: 0.8,
                order: 1,
            },
            {
                type: 'line',
                label: baselineLabel,
                data: monthsToShow.map(() => budgetTotal),
                borderColor: 'transparent',
                backgroundColor: 'transparent',
                borderWidth: 0,
                pointRadius: 0,
                pointHoverRadius: 0,
                showLine: false,
                _isBaseline: true,
                order: 0,
            }
        ];

        // Plugin draws full-width red line at budget value per bar
        const baselineMarkerPlugin = {
            id: 'baselineMarkerMeses',
            afterDatasetsDraw(chart) {
                const baselineDs = chart.data.datasets.find(ds => ds._isBaseline);
                if (!baselineDs) return;
                const { ctx, scales } = chart;
                const xScale = scales.x;
                const yScale = scales.y;
                ctx.save();
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                baselineDs.data.forEach((value, index) => {
                    if (value == null) return;
                    const yPixel = yScale.getPixelForValue(value);
                    const bandWidth = xScale.width / chart.data.labels.length;
                    const xCenter = xScale.getPixelForValue(index);
                    const halfBand = (bandWidth * 0.55) / 2;
                    ctx.beginPath();
                    ctx.moveTo(xCenter - halfBand, yPixel);
                    ctx.lineTo(xCenter + halfBand, yPixel);
                    ctx.stroke();
                });
                ctx.restore();
            }
        };

        this.charts[chartKey] = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels: monthsToShow, datasets },
            plugins: [baselineMarkerPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#64748b',
                            generateLabels: () => [
                                { text: 'Real', fillStyle: '#22c55e', strokeStyle: 'transparent', lineWidth: 0, hidden: false },
                                { text: baselineLabel, fillStyle: 'transparent', strokeStyle: '#ef4444', lineWidth: 3, hidden: false }
                            ]
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                if (ctx.dataset._isBaseline) return null;
                                const v = ctx.raw;
                                return isPercent
                                    ? ` Real: ${this.formatPercent(v)}%`
                                    : ` Real: ${this.formatEuro(v, 0)}k€`;
                            },
                            afterBody: () => {
                                return isPercent
                                    ? [`${baselineLabel}: ${this.formatPercent(budgetTotal)}%`]
                                    : [`${baselineLabel}: ${this.formatEuro(budgetTotal, 0)}k€`];
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b' } },
                    y: {
                        grid: { color: '#e2e8f0' },
                        ticks: {
                            color: '#64748b',
                            callback: (v) => isPercent ? `${this.formatPercent(v)}%` : `${this.formatEuro(v, 0)}k€`
                        }
                    }
                }
            }
        });
    }


    renderEvolucion(totals, companies, isByArea) {
        const chartId = isByArea ? 'evolucionAreaChart' : 'evolucionSociedadChart';
        const ctx = document.getElementById(chartId).getContext('2d');
        const chartKey = isByArea ? 'evolucionArea' : 'evolucionSociedad';

        if (this.charts[chartKey]) this.charts[chartKey].destroy();

        const kpiTitles = {
            'ventas': 'Ventas Totales',
            'rai': 'Resultado Antes de Impuestos',
            'ebitda': 'EBITDA (sin gerenc.)',
            'margen': 'Margen Bruto (%)',
            'costes-estructura': 'Costes de Estructura',
            'peso-estructura': 'Peso de la Estructura (%)',
            'variables': 'Variables',
            'fidelizacion': 'Planes de Fidelización'
        };
        const titleText = kpiTitles[this.activeKpiId] || 'Evolución Métrica';

        const baselineTitle = this.comparisonMode === 'budget' ? 'Ppto' : 'Mes Ant.';
        const baselineLabel = this.comparisonMode === 'budget' ? 'Presupuesto' : 'Mes Anterior';

        const chartWrapper = document.getElementById(chartId).closest('.chart-container');
        if (chartWrapper) {
            const h3 = chartWrapper.querySelector('h3');
            if (h3) h3.textContent = `Evolución Mensual - Por ${isByArea ? 'Área' : 'Sociedad'}`;
            const p = chartWrapper.querySelector('p');
            if (p) p.textContent = `${titleText} Acumulado/Mensual`;
        }

        // 1. Mostrar todos los meses que tengan algún dato real
        const populatedMonths = this.MOCK_DATA.months.filter(m => {
            return Object.values(this.DATA.actuals).some(cData => {
                if (!cData || !cData[m]) return false;
                return Object.values(cData[m]).some(val => val !== 0 && !Number.isNaN(val));
            });
        });
        const monthsToShow = populatedMonths.length > 0 ? populatedMonths : this.MOCK_DATA.months.slice(0, 1);

        const currMIdx = this.MOCK_DATA.months.indexOf(this.selectedMonth);
        const prevMonth = currMIdx > 0 ? this.MOCK_DATA.months[currMIdx - 1] : null;

        let displayMonths = [];
        if (this.comparisonMode === 'budget') {
            displayMonths = monthsToShow; // Show all populated months
        } else {
            // "Contra mes anterior" -> Only show prevMonth and selectedMonth
            if (prevMonth) displayMonths.push(prevMonth);
            displayMonths.push(this.selectedMonth);
        }

        let entities = isByArea ? (this.selectedAreas.length > 0 ? this.selectedAreas : this.MOCK_DATA.areas.map(a => a.name)) : companies;

        const datasets = [];

        // Dataset 1: Baseline (Always Budget for these two charts to provide fixed reference point)
        const budgetData = entities.map(entity => {
            const entityComps = isByArea ? this.MOCK_DATA.areas.find(a => a.name === entity).companies : [entity];
            const validComps = entityComps.filter(c => companies.includes(c));
            return this.getMetricValue(validComps, 'budget', null);
        });

        datasets.push({
            type: 'line',
            label: 'Presupuesto',
            data: budgetData,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            borderWidth: 0,
            pointRadius: 0,
            pointHoverRadius: 0,
            showLine: false,
            order: 0,
            _isBaseline: true,  // Flag for custom plugin
        });

        // Datasets: One for each Month
        const realColors = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'];

        displayMonths.forEach((m, idx) => {
            const data = entities.map(entity => {
                const entityComps = isByArea ? this.MOCK_DATA.areas.find(a => a.name === entity).companies : [entity];
                const validComps = entityComps.filter(c => companies.includes(c));
                return this.getMetricValue(validComps, 'actual', m);
            });

            datasets.push({
                type: 'bar',
                label: `Real (${m.split('-')[0]})`,
                data: data,
                backgroundColor: realColors[idx % realColors.length],
                borderRadius: 4,
                barPercentage: 0.8,
                categoryPercentage: 0.8,
                order: 1,
            });
        });

        // Custom plugin: draws a horizontal full-width line at the budget value for each entity group
        const baselineMarkerPlugin = {
            id: 'baselineMarker',
            afterDatasetsDraw(chart) {
                const baselineDs = chart.data.datasets.find(ds => ds._isBaseline);
                if (!baselineDs) return;
                const { ctx, scales } = chart;
                const xScale = scales.x;
                const yScale = scales.y;

                ctx.save();
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';

                baselineDs.data.forEach((value, index) => {
                    if (value == null) return;
                    const yPixel = yScale.getPixelForValue(value);
                    // Get the x bounds of this category group
                    const bandWidth = xScale.getPixelForTick ? 
                        (xScale.width / chart.data.labels.length) : 
                        xScale.getPixelForValue(index + 0.5) - xScale.getPixelForValue(index - 0.5);
                    const xCenter = xScale.getPixelForValue(index);
                    const halfBand = (bandWidth * 0.8) / 2; // 80% of band width
                    ctx.beginPath();
                    ctx.moveTo(xCenter - halfBand, yPixel);
                    ctx.lineTo(xCenter + halfBand, yPixel);
                    ctx.stroke();
                });
                ctx.restore();
            }
        };

        this.charts[chartKey] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: entities,
                datasets: datasets
            },
            plugins: [baselineMarkerPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { 
                    color: '#64748b',
                    generateLabels: (chart) => {
                        return chart.data.datasets
                            .filter(ds => !ds._isBaseline)
                            .map((ds, i) => ({
                                text: ds.label,
                                fillStyle: ds.backgroundColor,
                                strokeStyle: 'transparent',
                                lineWidth: 0,
                                hidden: false,
                                datasetIndex: chart.data.datasets.indexOf(ds)
                            }))
                            .concat([{
                                text: baselineLabel,
                                fillStyle: 'transparent',
                                strokeStyle: '#ef4444',
                                lineWidth: 3,
                                hidden: false,
                                datasetIndex: -1
                            }]);
                    }
                } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', maxRotation: 45, minRotation: 0 } },
                    y: {
                        grid: { color: '#e2e8f0' },
                        ticks: {
                            color: '#64748b',
                            callback: (v) => {
                                if (this.activeKpiId === 'margen' || this.activeKpiId === 'peso-estructura') {
                                    return `${this.formatPercent(v)}%`;
                                } else {
                                    return `${this.formatEuro(v, 0)}k€`;
                                }
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false }, // handled above
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                let v = ctx.raw;
                                if (this.activeKpiId === 'margen' || this.activeKpiId === 'peso-estructura') {
                                    return ` ${ctx.dataset.label}: ${this.formatPercent(v)}%`;
                                } else {
                                    return ` ${ctx.dataset.label}: ${this.formatEuro(v, 0)}k€`;
                                }
                            }
                        }
                    }
                }
            }
        });

        const tableContainer = document.getElementById(`table-${chartKey}`);
        if (tableContainer) {

            // The baseline is always Budget for this chart layout now
            let headersText = `<th>Entidad</th><th>Ppto (€)</th>`;
            displayMonths.forEach(m => headersText += `<th>Real ${m.split('-')[0].toUpperCase()} (€)</th>`);

            let tableHTML = `<table>
                <thead>
                    <tr>
                        ${headersText}
                    </tr>
                </thead>
                <tbody>`;

            const expenseKpis = ['costes-estructura', 'peso-estructura', 'variables', 'fidelizacion'];
            const isExpense = expenseKpis.includes(this.activeKpiId);

            entities.forEach((entity, eIdx) => {
                const bVal = budgetData[eIdx];
                let rowText = `<td>${entity}</td><td>${this.formatEuro(bVal, 0)}k€</td>`;

                displayMonths.forEach((m, mIdx) => {
                    // +1 because budget is dataset[0]
                    const rVal = datasets[mIdx + 1].data[eIdx];

                    const diff = rVal - bVal;
                    let colorClass = '';

                    if (Math.abs(diff) > 0.001) {
                        let isFavorable = diff > 0;
                        if (isExpense) isFavorable = diff < 0;
                        colorClass = isFavorable ? 'text-success' : 'text-danger';
                    } else {
                        colorClass = 'text-black'; // assuming you'll define this or just inline style
                    }

                    // For the 'text-black' to work or to just ensure it's black:
                    const styleOverride = colorClass === 'text-black' ? 'style="color: black !important;"' : '';

                    rowText += `<td class="${colorClass}" ${styleOverride}>${this.formatEuro(rVal, 0)}k€</td>`;
                });

                tableHTML += `<tr>${rowText}</tr>`;
            });
            tableHTML += `</tbody></table>`;
            tableContainer.innerHTML = tableHTML;
        }
    }

    getEntityColor(entityName, isByArea) {
        // Theme Definitions
        const themes = {
            "GTM": { area: "#64748b", companies: { "GTM": "#94a3b8" } },
            "GTM Servicios Industriales": { area: "#1e3a8a", companies: { "TAMOIN": "#60a5fa", "TECNEST": "#1d4ed8" } },
            "GTM Construcción": { area: "#14532d", companies: { "MATRA": "#4ade80", "NEI": "#22c55e", "NRT PORTUGAL": "#16a34a", "NORTON SUECIA": "#15803d", "SEGITEC": "#14532d" } },
            "GTM Latam": { area: "#7f1d1d", companies: { "NRT LATAM": "#f87171", "TAMOIN PERU": "#ef4444", "NRT PERU": "#dc2626", "NRT COLOMBIA+TALLERES": "#b91c1c", "NORTON ECUADOR": "#991b1b", "BIOTANK": "#fb923c", "NRT COM": "#f97316" } },
            "Participadas": { area: "#581c87", companies: { "ORBE": "#c084fc", "TARIFA": "#a855f7", "CTO NUCLEAR": "#9333ea", "DESNOR": "#7e22ce", "ARBOREA": "#6b21a8" } },
            "Ajustes conso": { area: "#d97706", companies: { "Ajustes conso": "#f59e0b" } }
        };

        if (isByArea) {
            return themes[entityName] ? themes[entityName].area : "#cbd5e1"; // Base Fallback
        } else {
            // Find which area this company belongs to
            for (const areaKey in themes) {
                if (themes[areaKey].companies[entityName]) {
                    return themes[areaKey].companies[entityName];
                }
            }
            return "#94a3b8"; // Global Fallback
        }
    }


    updateTables(totals, companies) {
        // Details Table
        const detailsHead = document.querySelector('#detailsTable thead tr th:nth-child(2)');
        if (detailsHead) {
            detailsHead.textContent = this.comparisonMode === 'budget' ? 'Presupuesto' : 'Mes Ant.';
        }

        const detailsBody = document.querySelector('#detailsTable tbody');
        detailsBody.innerHTML = "";

        this.MOCK_DATA.indicators.forEach(ind => {
            // Aggregate Ventas
            let actual = totals.actual[ind.id] || 0;
            let budget = totals.budget[ind.id] || 0;

            if (ind.id === 'ventas') {
                actual += (totals.actual['ventas_intragrupo'] || 0);
                budget += (totals.budget['ventas_intragrupo'] || 0);
            }

            // Skip intra group if we aggregated it into Ventas
            if (ind.id === 'ventas_intragrupo') return;

            const devAbs = actual - budget;
            let devPct = budget !== 0 ? (devAbs / Math.abs(budget)) * 100 : 0;

            let isFavorable = devAbs > 0;
            if (ind.type === 'expense') isFavorable = devAbs < 0;
            if (ind.type === 'both') isFavorable = true;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ind.id === 'ventas' ? 'Ventas Totales' : ind.name}</td>
                <td>${this.formatEuro(budget, 0)}k€</td>
                <td>${this.formatEuro(actual, 0)}k€</td>
                <td class="${devAbs >= 0 ? (ind.type === 'expense' ? 'text-danger' : 'text-success') : (ind.type === 'expense' ? 'text-success' : 'text-danger')}">
                    ${devAbs >= 0 ? '+' : ''}${this.formatEuro(devAbs)}k€
                </td>
                <td>${this.formatPercent(devPct)}%</td>
                <td><span class="status-badge ${isFavorable ? 'ok' : 'warning'}">${isFavorable ? 'Favor' : 'Desf'}</span></td>
            `;
            detailsBody.appendChild(row);
        });

        this.renderMatrixTable(companies);
        this.renderTopMoversTable(companies);
    }

    renderMatrixTable(companies) {
        const tableContainer = document.getElementById('matrixTable');
        if (!tableContainer) return;

        const headersHTML = ['<th style="min-width: 150px; position: sticky; left: 0; background: rgba(30,41,59,1); z-index: 10;">Indicador</th>'];
        const colEntities = [];

        this.MOCK_DATA.areas.forEach(area => {
            const areaComps = area.companies.filter(c => companies.includes(c));
            if (areaComps.length > 0) {
                headersHTML.push(`<th style="background: rgba(51,65,85,0.4); border-left: 2px solid #475569;">${area.name} (Área)</th>`);
                colEntities.push({ type: 'area', name: area.name, comps: areaComps });
                areaComps.forEach(comp => {
                    headersHTML.push(`<th>${comp}</th>`);
                    colEntities.push({ type: 'comp', name: comp, comps: [comp] });
                });
            }
        });

        tableContainer.querySelector('thead').innerHTML = `<tr>${headersHTML.join('')}</tr>`;

        const currMIdx = this.MOCK_DATA.months.indexOf(this.selectedMonth);
        const prevMonth = currMIdx > 0 ? this.MOCK_DATA.months[currMIdx - 1] : null;
        const baselineHeader = this.comparisonMode === 'budget' ? 'Ppto:' : 'Mes Ant.:';

        let bodyHTML = '';
        this.MOCK_DATA.indicators.forEach(ind => {
            if (ind.id === 'ventas_intragrupo') return; // Hide it here too

            let displayName = ind.id === 'ventas' ? 'Ventas Totales' : ind.name;
            let rowHtml = `<td style="position: sticky; left: 0; background: rgba(30,41,59,1); z-index: 10; color: white;"><strong>${displayName}</strong></td>`;
            colEntities.forEach(ent => {
                let bVal = 0, aVal = 0;
                ent.comps.forEach(c => {
                    if (this.comparisonMode === 'budget') {
                        bVal += (this.DATA.budget[c] && this.DATA.budget[c][ind.id]) || 0;
                    } else {
                        if (prevMonth && this.DATA.actuals[c] && this.DATA.actuals[c][prevMonth]) {
                            bVal += (this.DATA.actuals[c][prevMonth][ind.id]) || 0;
                        }
                    }

                    if (this.DATA.actuals[c] && this.DATA.actuals[c][this.selectedMonth]) {
                        aVal += (this.DATA.actuals[c][this.selectedMonth][ind.id]) || 0;
                    }

                    if (ind.id === 'ventas') {
                        if (this.comparisonMode === 'budget') {
                            bVal += (this.DATA.budget[c] && this.DATA.budget[c]['ventas_intragrupo']) || 0;
                        } else {
                            if (prevMonth && this.DATA.actuals[c] && this.DATA.actuals[c][prevMonth]) {
                                bVal += (this.DATA.actuals[c][prevMonth]['ventas_intragrupo']) || 0;
                            }
                        }

                        if (this.DATA.actuals[c] && this.DATA.actuals[c][this.selectedMonth]) {
                            aVal += (this.DATA.actuals[c][this.selectedMonth]['ventas_intragrupo']) || 0;
                        }
                    }
                });
                const diff = aVal - bVal;
                const pct = bVal !== 0 ? (diff / Math.abs(bVal)) * 100 : 0;
                const isFav = ind.type === 'expense' ? diff <= 0 : diff >= 0;
                const colorClass = isFav ? 'text-success' : 'text-danger';

                const styleMod = ent.type === 'area' ? 'background: rgba(51,65,85,0.1); border-left: 2px solid #475569;' : '';

                if (this.matrixShowPercent) {
                    rowHtml += `<td class="${colorClass}" style="text-align: center; font-weight: bold; ${styleMod}">${this.formatPercent(pct)}%</td>`;
                } else {
                    rowHtml += `<td style="font-size: 0.85em; line-height: 1.4; white-space: nowrap; ${styleMod}">
                        <div style="display: flex; justify-content: space-between; gap: 1rem;">
                            <span style="color: #94a3b8">${baselineHeader}</span> <span>${this.formatEuro(bVal, 0)}k€</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 1rem;">
                            <span style="color: #94a3b8">Real:</span> <span>${this.formatEuro(aVal, 0)}k€</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 1rem; margin-top: 4px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 4px;" class="${colorClass}">
                            <span>Desv:</span> <strong>${diff > 0 ? '+' : ''}${this.formatEuro(diff)}k€</strong>
                        </div>
                    </td>`;
                }
            });
            bodyHTML += `<tr>${rowHtml}</tr>`;
        });
        tableContainer.querySelector('tbody').innerHTML = bodyHTML;
    }

    renderTopMoversTable(companies) {
        const table = document.querySelector('#topMoversTable');
        const tbody = table.querySelector('tbody');
        const theadTr = table.querySelector('thead tr');
        if (!tbody || !theadTr) return;

        // Dynamically adjust headers based on mode
        if (this.comparisonMode === 'budget') {
            theadTr.innerHTML = `
                <th>Sociedad</th>
                <th>Indicador</th>
                <th>Desv. Ppto (€)</th>
                <th>Desv. Ppto (%)</th>
            `;
        } else {
            theadTr.innerHTML = `
                <th>Sociedad</th>
                <th>Indicador</th>
                <th>Var. Mes Ant. (€)</th>
                <th>Var. Mes Ant. (%)</th>
            `;
        }

        const dataMonths = this.MOCK_DATA.months;
        const currMIdx = dataMonths.indexOf(this.selectedMonth);
        const prevMonth = currMIdx > 0 ? dataMonths[currMIdx - 1] : null;

        let movers = [];
        const targetedKPIs = ['margen_bruto', 'ebitda_sin_gerenciamiento', 'estructura', 'margen_antes_impuestos'];

        companies.forEach(comp => {
            this.MOCK_DATA.indicators.filter(i => targetedKPIs.includes(i.id)).forEach(ind => {
                let bVal = 0;
                if (this.comparisonMode === 'budget') {
                    bVal = (this.DATA.budget[comp] && this.DATA.budget[comp][ind.id]) || 0;
                } else {
                    bVal = prevMonth && this.DATA.actuals[comp] && this.DATA.actuals[comp][prevMonth] ? this.DATA.actuals[comp][prevMonth][ind.id] || 0 : 0;
                }
                
                let cVal = 0, pVal = 0;
                
                if (this.DATA.actuals[comp]) {
                    if (this.DATA.actuals[comp][this.selectedMonth]) cVal = this.DATA.actuals[comp][this.selectedMonth][ind.id] || 0;
                    if (prevMonth && this.DATA.actuals[comp][prevMonth]) pVal = this.DATA.actuals[comp][prevMonth][ind.id] || 0;
                }

                // Transform Margen Bruto from Absolute Euro into Percentage (%)
                let typeOverride = ind.type;
                if (ind.id === 'margen_bruto') {
                    typeOverride = 'ratio'; 
                    // Ventas Totales
                    const getVentas = (dataset, month) => {
                        if (!dataset[comp]) return 0;
                        const dataObj = month ? dataset[comp][month] : dataset[comp];
                        if (!dataObj) return 0;
                        return (dataObj['ventas'] || 0) + (dataObj['ventas_intragrupo'] || 0);
                    };
                    const bVentas = this.comparisonMode === 'budget' ? getVentas(this.DATA.budget, null) : getVentas(this.DATA.actuals, prevMonth);
                    const cVentas = getVentas(this.DATA.actuals, this.selectedMonth);
                    const pVentas = getVentas(this.DATA.actuals, prevMonth);
                    
                    bVal = bVentas !== 0 ? (bVal / Math.abs(bVentas)) * 100 : 0;
                    cVal = cVentas !== 0 ? (cVal / Math.abs(cVentas)) * 100 : 0;
                    pVal = pVentas !== 0 ? (pVal / Math.abs(pVentas)) * 100 : 0;
                }

                if (bVal === 0 && cVal === 0 && pVal === 0) return;

                const diffPpto = cVal - bVal;
                // For ratios, % deviation doesn't linearly make sense relative to small decimal changes, but we leave it.
                const pctPpto = bVal !== 0 ? (diffPpto / Math.abs(bVal)) * 100 : 0;
                const diffPrev = cVal - pVal;
                const pctPrev = pVal !== 0 ? (diffPrev / Math.abs(pVal)) * 100 : 0;

                const score = Math.abs(diffPrev) + Math.abs(diffPpto) * 0.5;

                const displayName = ind.id === 'margen_bruto' ? 'Margen Bruto (%)' : ind.name;

                movers.push({ comp, ind: {name: displayName}, bVal, cVal, pVal, diffPpto, pctPpto, diffPrev, pctPrev, score, type: typeOverride });
            });
        });

        movers.sort((a, b) => b.score - a.score);
        const topMovers = movers.slice(0, 10);

        let bodyHTML = '';
        topMovers.forEach(m => {
            const isFavPpto = m.type === 'expense' ? m.diffPpto <= 0 : m.diffPpto >= 0;
            const isFavPrev = m.type === 'expense' ? m.diffPrev <= 0 : m.diffPrev >= 0;

            const suffix = m.type === 'ratio' ? '%' : 'k€';
            const formatVal = (val, t) => t === 'ratio' ? this.formatPercent(val) : this.formatEuro(val);

            if (this.comparisonMode === 'budget') {
                bodyHTML += `<tr>
                    <td>${m.comp}</td>
                    <td>${m.ind.name}</td>
                    <td class="${isFavPpto ? 'text-success' : 'text-danger'}">${m.diffPpto > 0 ? '+' : ''}${formatVal(m.diffPpto, m.type)}${suffix}</td>
                    <td class="${isFavPpto ? 'text-success' : 'text-danger'}">${this.formatPercent(m.pctPpto)}%</td>
                </tr>`;
            } else {
                bodyHTML += `<tr>
                    <td>${m.comp}</td>
                    <td>${m.ind.name}</td>
                    <td class="${isFavPrev ? 'text-success' : 'text-danger'}">${m.diffPrev > 0 ? '+' : ''}${formatVal(m.diffPrev, m.type)}${suffix}</td>
                    <td class="${isFavPrev ? 'text-success' : 'text-danger'}">${prevMonth ? (m.pctPrev > 0 ? '+' : '') + this.formatPercent(m.pctPrev) + '%' : '-'}</td>
                </tr>`;
            }
        });
        tbody.innerHTML = bodyHTML;
    }

API_FOLDERS_URL = "/api/GetFolders";
API_EXCEL_URL = "/api/GetExcel?year=";

async fetchSPFolders() {
    
    const statusEl = document.getElementById('spStatusMsg');
    const selectorEl = document.getElementById('spYearSelector');
    const btnEl = document.getElementById('btnLoadFromSP');
    statusEl.textContent = "Consultando API…";
    statusEl.style.color = "#64748b";

  try {
    const response = await fetch(this.API_FOLDERS_URL, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Sin permisos (API). Revisa autenticación/roles en la Static Web App.");
      }
      //throw new Error(`Error API (GetFolders): HTTP ${response.status}`);
        let detail = "";
        try { detail = await response.text(); } catch {}
        throw new Error(`Error API (GetFolders): HTTP ${response.status}${detail ? " - " + detail : ""}`);
    }

    const folders = await response.json();

    const years = (folders || [])
      .filter(name => name && name !== "Dashboard" && name !== "Forms" && !name.startsWith("_"));

    if (years.length === 0) {
      statusEl.textContent = "No se encontraron carpetas/años (API devolvió vacío).";
      statusEl.style.color = "#ef4444";
      return;
    }

    // Rellenar selector
    selectorEl.innerHTML = 'Selecciona un año...';
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      selectorEl.appendChild(opt);
    });

    selectorEl.removeAttribute('disabled');
    btnEl.removeAttribute('disabled');
    btnEl.style.cursor = 'pointer';
    btnEl.style.opacity = '1';

    statusEl.textContent = "Carpetas cargadas desde la API. Listo.";
    statusEl.style.color = "#10b981";

    // Importante: evita acumular listeners si se re-ejecuta fetchSPFolders
    btnEl.onclick = () => {
      const year = selectorEl.value;
      if (!year) {
        alert("Por favor, selecciona un año en el desplegable.");
        return;
      }
      this.fetchSPExcel(year);
    };

  } catch (error) {
    console.error(error);
    selectorEl.innerHTML = 'Fallo de conexión';
    statusEl.textContent = `Error accediendo a la API intermedia: ${error.message}`;
    statusEl.style.color = "#ef4444";
  }
}

async fetchSPExcel(year) {

  const btnEl = document.getElementById('btnLoadFromSP');
  const statusEl = document.getElementById('spStatusMsg');

  btnEl.textContent = "Descargando...";
  btnEl.setAttribute('disabled', 'true');
  btnEl.style.opacity = '0.6';
  statusEl.textContent = `Buscando Excel para el año ${year}...`;
  statusEl.style.color = "#64748b";

  try {
    const downloadResponse = await fetch(`${this.API_EXCEL_URL}${encodeURIComponent(year)}`);

    if (!downloadResponse.ok) {
      if (downloadResponse.status === 401 || downloadResponse.status === 403) {
        throw new Error("Sin permisos (API). Revisa autenticación/roles en la Static Web App.");
      }
      throw new Error(`Error API (GetExcel): HTTP ${downloadResponse.status}`);
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();

    statusEl.textContent = "Procesando Excel en memoria...";

    const dataUI8 = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(dataUI8, { type: 'array' });

    const success = this.processWorkbook(workbook);
    if (!success) {
      throw new Error("El archivo no tiene la pestaña necesaria (Ppto/Presupuesto) o el formato esperado.");
    }

    this.update();
    statusEl.textContent = `¡Carga exitosa! (Año ${year})`;
    statusEl.style.color = "#10b981";
    btnEl.textContent = "Actualizar Datos";

  } catch (error) {
    console.error("Error al cargar desde API:", error);
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.style.color = "#ef4444";
    btnEl.textContent = "Cargar Datos";
    alert(`❌ Error cargando Excel desde la API:\n${error.message}`);
  } finally {
    btnEl.removeAttribute('disabled');
    btnEl.style.opacity = '1';
  }
}

    processWorkbook(workbook) {
        const sheetNames = workbook.SheetNames;
        console.log("Loaded Excel Sheets:", sheetNames);

        if (sheetNames.length === 0) return false;

        // Locate budget sheet
        let budgetSheetName = sheetNames.find(n => n.toLowerCase().includes("ppto") || n.toLowerCase().includes("presupuesto"));
        if (!budgetSheetName) budgetSheetName = sheetNames[0];

        const budgetData = XLSX.utils.sheet_to_json(workbook.Sheets[budgetSheetName], { header: 1 });
        const newBudget = {};
        this.mapExcelData(budgetData, newBudget, true);

        // 2. Process Actuals
        const loadedMonths = [];
        const newActuals = {};
        sheetNames.forEach(name => {
            if (name === budgetSheetName) return;

            const normalized = name.toLowerCase().trim();
            // Accept sheets with month names
            const isMonth = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"].some(m => normalized.startsWith(m));

            if (isMonth) {
                loadedMonths.push(normalized);
                const data = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
                const monthlyData = {};
                this.mapExcelData(data, monthlyData, false);

                Object.keys(monthlyData).forEach(company => {
                    if (!newActuals[company]) newActuals[company] = {};
                    newActuals[company][normalized] = monthlyData[company];
                });
            }
        });

        // RE-ASSIGN GLOBALS
        if (Object.keys(newBudget).length > 0) {
            this.DATA.budget = newBudget;
            this.DATA.actuals = newActuals;

            // Clean MOCK_DATA.months to exactly what we loaded
            if (loadedMonths.length > 0) {
                this.MOCK_DATA.months = loadedMonths;
                // Always default to the highest (last) loaded month per user request
                this.selectedMonth = loadedMonths[loadedMonths.length - 1];

                // Re-render the month filter UI
                const monthSelect = document.getElementById('monthFilter');
                if (monthSelect) {
                    monthSelect.innerHTML = "";
                    this.MOCK_DATA.months.forEach(month => {
                        const option = document.createElement('option');
                        option.value = month;
                        option.textContent = month;
                        if (month === this.selectedMonth) option.selected = true;
                        monthSelect.appendChild(option);
                    });
                }
            }

            console.log("Successfully overridden data from Excel:", this.DATA);
            return true;
        }

        return false;
    }

    mapExcelData(rows, targetObj, isBudget) {
        if (rows.length < 2) return;

        // Scan for header row (might not be row 0 if there are titles in the excel)
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
            if (!rows[i]) continue;
            const rStr = rows[i].map(c => String(c).toLowerCase()).join(" ");
            if (rStr.includes("gtm") || rStr.includes("tamoin") || rStr.includes("orbe")) {
                headerRowIdx = i;
                break;
            }
        }
        if (headerRowIdx === -1) headerRowIdx = 0; // fallback
        
        const headers = rows[headerRowIdx];
        const indicatorsRowStart = headerRowIdx + 1;

        // Map indicator names to IDs (fallback)
        const indicatorMap = {
            "ventas": "ventas",
            "ventas netas": "ventas",
            "ventas intragrupo": "ventas_intragrupo",
            "costes": "costes",
            "costes directos": "costes",
            "variables": "variables",
            "costes variables": "variables",
            "fidelización": "fidelizacion",
            "planes de fidelización": "fidelizacion",
            "fidelizacion": "fidelizacion",
            "planes de fidelizacion": "fidelizacion",
            "planes fidelizacion": "fidelizacion",
            "planes fidelización": "fidelizacion",
            "estructura": "estructura",
            "costes estructura": "estructura",
            "costes de estructura": "estructura",
            "intragrupo": "intragrupo",
            "costes intragrupo/ servicios corporativos": "intragrupo",
            "extraordinarios": "extraordinarios",
            "amortización": "amortizacion",
            "amortizacion": "amortizacion",
            "financieros": "financieros",
            "gastos financieros": "financieros",
            "financieros intragrupo": "financieros_intragrupo",

            // Profit Indicators
            "margen bruto": "margen_bruto",
            "ebitda": "ebitda",
            "margen operativo / ebitda": "ebitda",
            "margen operativo": "ebitda",
            "ebitda s/g": "ebitda_sin_gerenciamiento",
            "ebitda s.g.": "ebitda_sin_gerenciamiento",
            "ebitda sin gerenciamiento": "ebitda_sin_gerenciamiento",
            "ebitda (sin gerenc.)": "ebitda_sin_gerenciamiento",
            "ebitda sin gerenc.": "ebitda_sin_gerenciamiento",
            "margen operativo / ebitda sin gerenciamiento": "ebitda_sin_gerenciamiento",
            "margen operativo / ebitda (sin gerenc.)": "ebitda_sin_gerenciamiento",
            "margen antes de impuestos": "margen_antes_impuestos",
            "bai": "margen_antes_impuestos",
            "margen neto": "margen_neto",
            "resultado neto": "margen_neto"
        };

        const companyAliases = {
            "nortonsuecia": "NORTON SUECIA",
            "nrtcolombia+talleres": "NRT COLOMBIA+TALLERES",
            "nrtcolombia": "NRT COLOMBIA+TALLERES",
            "colombia": "NRT COLOMBIA+TALLERES",
            "dtonuclear": "CTO NUCLEAR",
            "ctonuclear": "CTO NUCLEAR",
            "orbe": "ORBE",
            "desnor": "DESNOR",
            "arborea": "ARBOREA",
            "ajustesconso": "Ajustes conso",
            "ajustesdeconsolidacion": "Ajustes conso",
            "ajustes": "Ajustes conso",
            "ajustesconsolidacion": "Ajustes conso",
            "tarifa": "TARIFA",
            "matra": "MATRA",
            "nei": "NEI",
            "nrtportugal": "NRT PORTUGAL",
            "portugal": "NRT PORTUGAL",
            "segitec": "SEGITEC",
            "nrtlatam": "NRT LATAM",
            "tamoinperu": "TAMOIN PERU",
            "t.peru": "TAMOIN PERU",
            "nrtperu": "NRT PERU",
            "nortonecuador": "NORTON ECUADOR",
            "ecuador": "NORTON ECUADOR",
            "biotank": "BIOTANK",
            "nrtcom": "NRT COM",
            "gtm": "GTM",
            "tamoin": "TAMOIN",
            "tecnest": "TECNEST"
        };

        // Identify companies in columns (skipping column A)
        for (let j = 1; j < headers.length; j++) {
            let rawComp = String(headers[j]).trim();
            if (!rawComp) continue;

            const cNorm = rawComp.toLowerCase().replace(/\s+/g, '');
            // Do not process 'Total' or 'Presupuesto' sum columns as independent companies
            if (cNorm.includes('total')) continue;

            let companyName = companyAliases[cNorm] || rawComp;
            
            // Fallback for variations not explicitly in aliases (e.g., "T. Peru" vs "Tamoin Peru")
            if (cNorm.includes("ajuste") || cNorm.includes("conso")) companyName = "Ajustes conso";
            else if (cNorm.includes("colombia") && cNorm.includes("talleres")) companyName = "NRT COLOMBIA+TALLERES";
            else if (cNorm.includes("colombia")) companyName = "NRT COLOMBIA+TALLERES";
            else if (cNorm.includes("t.peru") || (cNorm.includes("tamoin") && cNorm.includes("peru"))) companyName = "TAMOIN PERU";
            else if (cNorm === "nrtperu") companyName = "NRT PERU";
            else if (cNorm.includes("portugal")) companyName = "NRT PORTUGAL";
            else if (cNorm.includes("suecia")) companyName = "NORTON SUECIA";
            else if (cNorm.includes("ecuador")) companyName = "NORTON ECUADOR";

            targetObj[companyName] = {};

            // Process indicators for this company
            for (let i = indicatorsRowStart; i < rows.length; i++) {
                let id = null;
                if (rows[i] && rows[i][0]) {
                    const indicatorName = String(rows[i][0]).toLowerCase().trim();
                    id = indicatorMap[indicatorName];
                }

                const value = rows[i][j] || 0;

                if (id) {
                    if (targetObj[companyName][id] === undefined) {
                        targetObj[companyName][id] = Number(value);
                    }
                }
            }

            // Calculation of derived fields if missing
            const c = targetObj[companyName];
            if (c.ventas !== undefined && c.costes !== undefined && c.margen_bruto === undefined) {
                c.margen_bruto = c.ventas - c.costes;
            }
            if (c.margen_bruto !== undefined && c.variables !== undefined && c.ebitda === undefined) {
                c.ebitda = c.margen_bruto - (c.variables + (c.estructura || 0));
            }
            // Si el Excel no trae explícitamente EBITDA sin gerenciamiento pero sí EBITDA
            if (c.ebitda !== undefined && c.ebitda_sin_gerenciamiento === undefined) {
                c.ebitda_sin_gerenciamiento = c.ebitda;
            }
            if (c.ebitda !== undefined && c.amortizacion !== undefined && c.margen_antes_impuestos === undefined) {
                c.margen_antes_impuestos = c.ebitda - c.amortizacion - (c.financieros || 0);
            }
        }
    }

    generateInsights(totals, companies) {
        const container = document.getElementById('insightsContent');
        if (!container) return; // Prevent "Cannot set properties of null" error

        container.innerHTML = "";

        // Insight 1: Main EBITDA impact
        const devEbitda = totals.actual.ebitda_sin_gerenciamiento - totals.budget.ebitda_sin_gerenciamiento;
        const favorable = devEbitda >= 0;

        const item1 = document.createElement('div');
        item1.className = `insight-item ${favorable ? 'favorable' : 'unfavorable'}`;
        item1.innerHTML = `
            <h4>Impacto EBITDA Mensual</h4>
            <p>El EBITDA del grupo para ${this.selectedMonth} está un <strong>${Math.abs((devEbitda / totals.budget.ebitda_sin_gerenciamiento) * 100).toFixed(1)}%</strong> ${favorable ? 'por encima' : 'por debajo'} de lo presupuestado.</p>
        `;
        container.appendChild(item1);

        // Insight 2: Top contributing company
        const rankings = companies.map(comp => {
            const actual = this.DATA.actuals[comp] && this.DATA.actuals[comp][this.selectedMonth] ? this.DATA.actuals[comp][this.selectedMonth].ebitda_sin_gerenciamiento : 0;
            const budget = this.DATA.budget[comp].ebitda_sin_gerenciamiento || 0;
            const devPct = budget !== 0 ? ((actual - budget) / Math.abs(budget)) * 100 : 0;
            return { name: comp, val: actual, dev: devPct };
        }).sort((a, b) => b.dev - a.dev);

        if (rankings.length > 0) {
            const top = rankings[0];
            const bottom = rankings[rankings.length - 1];

            const item2 = document.createElement('div');
            item2.className = `insight-item ${top.dev > 0 ? 'favorable' : ''}`;
            item2.innerHTML = `
                <h4>Top Contribuidor</h4>
                <p><strong>${top.name}</strong> es la sociedad con mayor desviación favorable aportando €${(top.dev / 1000).toFixed(1)}k extra al EBITDA.</p>
            `;
            container.appendChild(item2);

            const item3 = document.createElement('div');
            item3.className = `insight-item unfavorable`;
            item3.innerHTML = `
                <h4>Punto Crítico</h4>
                <p><strong>${bottom.name}</strong> presenta la mayor desviación negativa del mes (€${(bottom.dev / 1000).toFixed(1)}k).</p>
            `;
            container.appendChild(item3);
        }
    }
}

new Dashboard();