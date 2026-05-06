/**
 * GetExcel ÔÇö Azure Function
 * 
 * Descarga el primer archivo Excel (.xlsx / .xlsm) encontrado en la
 * carpeta del a├▒o indicado y lo devuelve como stream binario.
 * 
 * GET /api/GetExcel?year=2026 ÔåÆ binary (application/octet-stream)
 */
const { listDriveChildren, downloadDriveItem } = require("../shared/graphClient");

module.exports = async function (context, req) {
    const year = req.query.year;

    if (!year) {
        context.res = {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Falta el par├ímetro 'year'." })
        };
        return;
    }

    context.log(`GetExcel: fetching Excel for year "${year}"`);

    try {
        // 1. Listar archivos dentro de la carpeta del a├▒o
        const items = await listDriveChildren(year, context);

        // 2. Buscar el primer archivo Excel
        const excelFile = items.find(item =>
            item.file &&
            (item.name.toLowerCase().endsWith(".xlsx") ||
             item.name.toLowerCase().endsWith(".xlsm"))
        );

        if (!excelFile) {
            context.res = {
                status: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    error: `No se encontr├│ ning├║n archivo Excel en la carpeta "${year}".`,
                    filesFound: items.filter(i => i.file).map(i => i.name)
                })
            };
            return;
        }

        context.log(`GetExcel: downloading "${excelFile.name}" (${excelFile.size} bytes)`);

        // 3. Descargar el contenido binario
        const buffer = await downloadDriveItem(excelFile.id, context);

        context.log(`GetExcel: download complete ÔÇö ${buffer.length} bytes`);

        // 4. Devolver como binario
        context.res = {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${excelFile.name}"`,
                "Content-Length": buffer.length.toString()
            },
            body: buffer,
            isRaw: true
        };

    } catch (error) {
        context.log.error("GetExcel error:", error.message);

        context.res = {
            status: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                error: "Error descargando el Excel desde SharePoint",
                detail: error.message
            })
        };
    }
};