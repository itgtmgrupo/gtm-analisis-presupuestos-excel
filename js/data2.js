const MOCK_DATA = {
    areas: [
        {
            name: "GTM",
            companies: ["GTM"]
        },
        {
            name: "GTM Servicios Industriales",
            companies: ["TAMOIN", "TECNEST"]
        },
        {
            name: "GTM Construcción",
            companies: ["MATRA", "NEI", "NRT PORTUGAL", "NORTON SUECIA", "SEGITEC"]
        },
        {
            name: "GTM Latam",
            companies: ["NRT LATAM", "TAMOIN PERU", "NRT PERU", "NRT COLOMBIA+TALLERES", "NORTON ECUADOR", "BIOTANK", "NRT COM"]
        },
        {
            name: "Participadas",
            companies: ["ORBE", "TARIFA", "CTO NUCLEAR", "DESNOR", "ARBOREA"]
        },
        {
            name: "Ajustes conso",
            companies: ["Ajustes conso"]
        }
    ],
    months: [
        "enero-2026", "febrero-2026", "marzo-2026", "abril-2026", "mayo-2026", "junio-2026",
        "julio-2026", "agosto-2026", "septiembre-2026", "octubre-2026", "noviembre-2026", "diciembre-2026"
    ],
    indicators: [
        { id: "ventas", name: "Ventas", type: "income" },
        { id: "ventas_intragrupo", name: "Ventas Intragrupo", type: "income" },
        { id: "costes", name: "Costes", type: "expense" },
        { id: "margen_bruto", name: "Margen Bruto", type: "profit" },
        { id: "variables", name: "Variables", type: "expense" },
        { id: "fidelizacion", name: "Planes de Fidelización", type: "expense" },
        { id: "estructura", name: "Costes de Estructura", type: "expense" },
        { id: "intragrupo", name: "Costes Intragrupo", type: "expense" },
        { id: "ebitda", name: "EBITDA", type: "profit" },
        { id: "ebitda_sin_gerenciamiento", name: "EBITDA sin Gerenciamiento", type: "profit" },
        { id: "margen_antes_impuestos", name: "Margen antes de impuestos", type: "profit" },
        { id: "margen_neto", name: "Margen Neto", type: "profit" },
        { id: "extraordinarios", name: "Extraordinarios", type: "both" },
        { id: "amortizacion", name: "Amortización", type: "expense" },
        { id: "financieros", name: "Financieros", type: "expense" },
        { id: "financieros_intragrupo", name: "Financieros Intragrupo", type: "expense" },
        { id: "pipeline", name: "Pipeline", type: "income" },
        { id: "obra_en_curso", name: "Obra en Curso", type: "income" }
    ]
};

// Tool to generate random data
function generateData() {
    const budget = {};
    const actuals = {};

    MOCK_DATA.areas.forEach(area => {
        area.companies.forEach(company => {
            // Budget (Fixed for the year)
            budget[company] = {
                ventas: Math.random() * 1000000 + 500000,
                ventas_intragrupo: 0,
                costes: 0,
                variables: 0,
                fidelizacion: 0,
                estructura: 0,
                intragrupo: 0,
                extraordinarios: 0,
                amortizacion: 0,
                financieros: 0,
                financieros_intragrupo: 0,
                margen_bruto: 0,
                ebitda: 0,
                ebitda_sin_gerenciamiento: 0,
                margen_antes_impuestos: 0,
                margen_neto: 0,
                pipeline: 0,
                obra_en_curso: 0
            };

            // Secondary logic for budget
            budget[company].costes = budget[company].ventas * 0.4;
            budget[company].variables = budget[company].ventas * 0.1;
            budget[company].fidelizacion = budget[company].ventas * 0.05;
            budget[company].estructura = budget[company].ventas * 0.15;
            budget[company].intragrupo = budget[company].ventas * 0.05;
            budget[company].extraordinarios = 0;
            budget[company].amortizacion = budget[company].ventas * 0.03;
            budget[company].financieros = budget[company].ventas * 0.02;
            budget[company].financieros_intragrupo = budget[company].ventas * 0.01;

            // Derived EBITDA
            budget[company].margen_bruto = budget[company].ventas - budget[company].costes;
            budget[company].ebitda = budget[company].margen_bruto - (budget[company].variables + budget[company].fidelizacion + budget[company].estructura + budget[company].intragrupo);
            budget[company].ebitda_sin_gerenciamiento = budget[company].ebitda + budget[company].intragrupo;
            budget[company].margen_antes_impuestos = budget[company].ebitda - budget[company].amortizacion - budget[company].financieros;
            budget[company].margen_neto = budget[company].margen_antes_impuestos * 0.75; // 25% tax mock

            // Actuals (Month by month)
            actuals[company] = {};
            MOCK_DATA.months.forEach((month, idx) => {
                // Only generate up to May for "Real" data as if it's currently June
                if (idx > 4) return;

                const variance = 1 + (Math.random() * 0.2 - 0.1); // +/- 10%
                actuals[company][month] = {
                    ventas: (budget[company].ventas) * variance,
                    costes: (budget[company].costes) * (1 + (Math.random() * 0.1 - 0.05)),
                    variables: (budget[company].variables) * (1 + (Math.random() * 0.3 - 0.15)),
                    fidelizacion: (budget[company].fidelizacion) * 1.02,
                    estructura: (budget[company].estructura) * 0.98,
                    intragrupo: (budget[company].intragrupo),
                    extraordinarios: Math.random() > 0.8 ? 5000 : 0,
                    amortizacion: (budget[company].amortizacion),
                    financieros: (budget[company].financieros),
                    financieros_intragrupo: (budget[company].financieros_intragrupo)
                };

                const a = actuals[company][month];
                a.margen_bruto = a.ventas - a.costes;
                a.ebitda = a.margen_bruto - (a.variables + a.fidelizacion + a.estructura + a.intragrupo);
                a.ebitda_sin_gerenciamiento = a.ebitda + a.intragrupo;
                a.margen_antes_impuestos = a.ebitda - a.amortizacion - a.financieros;
                a.margen_neto = a.margen_antes_impuestos * 0.75;
            });
        });
    });

    return { budget, actuals };
}

const DATA = generateData();
window.DashboardData = { MOCK_DATA, DATA };