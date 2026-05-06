/**
 * GetFolders ÔÇö Azure Function
 * 
 * Devuelve un array JSON con los nombres de las carpetas (a├▒os)
 * dentro de la biblioteca "Seguimiento Presupuesto" en SharePoint.
 * 
 * GET /api/GetFolders ÔåÆ ["2025", "2026"]
 */
const { listDriveChildren } = require("../shared/graphClient");

module.exports = async function (context, req) {
    context.log("GetFolders: invoked");

    try {
        // Listar hijos de la ra├¡z del Drive (pasamos context para logging)
        const items = await listDriveChildren("", context);

        // Filtrar solo carpetas, excluir carpetas del sistema
        const folders = items
            .filter(item => item.folder)
            .map(item => item.name)
            .filter(name =>
                name &&
                name !== "Forms" &&
                name !== "Dashboard" &&
                !name.startsWith("_")
            )
            .sort();

        context.log(`GetFolders: found ${folders.length} folders: ${folders.join(", ")}`);

        context.res = {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(folders)
        };

    } catch (error) {
        context.log.error("GetFolders error:", error.message);

        context.res = {
            status: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                error: "Error accediendo a SharePoint v├¡a Graph API",
                detail: error.message
            })
        };
    }
};