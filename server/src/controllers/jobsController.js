import {
  generateInvoicesForAllSocieties,
  runRemindersForAllSocieties,
  runRemindersForSociety,
} from "../services/invoiceService.js";
import { generateDueMaintenanceSchedules } from "../services/maintenanceScheduleService.js";

export async function monthlyInvoicesJobHandler(_req, res) {
  const result = await generateInvoicesForAllSocieties();
  res.json(result);
}

export async function remindersJobHandler(req, res) {
  if (req.user?.societyId) {
    const result = await runRemindersForSociety(
      req.user.societyId,
      req.user.id,
    );
    res.json(result);
    return;
  }

  const result = await runRemindersForAllSocieties();
  res.json(result);
}

export async function maintenanceSchedulesJobHandler(_req, res) {
  const result = await generateDueMaintenanceSchedules();
  res.json(result);
}
