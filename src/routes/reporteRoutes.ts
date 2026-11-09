import { Router, Request, Response, NextFunction } from "express";
import { auth } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import { crearReporteSchema } from "../schemas/reporteSchema.js";
import { reporteService } from "../services/reporteService.js"; 

const router = Router();

router.post(
  "/",
  auth(["alumno"]),
  validate(crearReporteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idUsuarioReportante = req.user!.id_usuario; 
      const { id_usuario_reportado, motivo } = req.body;

      const nuevoReporte = await reporteService.crearReporte(
        idUsuarioReportante,
        id_usuario_reportado,
        motivo
      );

      res.status(201).json({ 
        message: "Reporte creado exitosamente", 
        nuevoReporte 
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;