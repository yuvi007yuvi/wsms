import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo, vehicleType, materialId, sourceId } = req.query;

    // Determine the date range needed. We need at least the last 7 days for the trend chart,
    // plus whatever range the user requested.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    let minDate = new Date(sevenDaysAgo);
    let maxDate = new Date(today);
    maxDate.setHours(23, 59, 59, 999);

    const filterFrom = dateFrom ? new Date(String(dateFrom)) : null;
    const filterTo = dateTo ? new Date(String(dateTo)) : null;

    if (filterFrom) {
      filterFrom.setHours(0, 0, 0, 0);
      if (filterFrom < minDate) minDate = filterFrom;
    }
    if (filterTo) {
      filterTo.setHours(23, 59, 59, 999);
      if (filterTo > maxDate) maxDate = filterTo;
    }

    // Fetch ONLY the required fields to keep the query lightning fast and memory small
    const slips = await prisma.weighmentSlip.findMany({
      where: {
        date: {
          gte: minDate,
          lte: maxDate
        }
      },
      select: {
        id: true,
        date: true,
        slipNumber: true,
        netWeight: true,
        grossWeight: true,
        tareWeight: true,
        materialId: true,
        sourceId: true,
        vehicleId: true,
        vehicle: {
          select: {
            vehicleNumber: true,
            vehicleType: {
              select: { name: true }
            }
          }
        },
        material: { select: { name: true } },
        source: { select: { name: true } },
        destination: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    });

    // Extract filters
    const filterVehicleTypeStr = vehicleType && vehicleType !== 'all' ? String(vehicleType) : null;
    const filterMaterialStr = materialId && materialId !== 'all' ? String(materialId) : null;
    const filterSourceStr = sourceId && sourceId !== 'all' ? String(sourceId) : null;

    // 1. Filter slips based on user selection (for the main stats)
    let filteredSlips = slips as any[];
    if (filterFrom) {
      filteredSlips = filteredSlips.filter(s => new Date(s.date) >= filterFrom);
    }
    if (filterTo) {
      filteredSlips = filteredSlips.filter(s => new Date(s.date) <= filterTo);
    }
    if (filterVehicleTypeStr) {
      filteredSlips = filteredSlips.filter(s => (s.vehicle?.vehicleType?.name || '') === filterVehicleTypeStr);
    }
    if (filterMaterialStr) {
      filteredSlips = filteredSlips.filter(s => s.materialId === filterMaterialStr);
    }
    if (filterSourceStr) {
      filteredSlips = filteredSlips.filter(s => s.sourceId === filterSourceStr);
    }

    const hasFilters = !!(filterFrom || filterTo || filterVehicleTypeStr || filterMaterialStr || filterSourceStr);

    // 2. Calculate Stats
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const baseSlips = hasFilters ? filteredSlips : slips.filter((s: any) => new Date(s.date) >= today);
    const todaySlips = baseSlips;
    const yesterdaySlips = slips.filter((s: any) => {
      const d = new Date(s.date);
      return d >= yesterday && d < today;
    });

    const totalSlipsToday = todaySlips.length;
    const totalSlipsYesterday = yesterdaySlips.length;
    const totalNetWeight = todaySlips.reduce((sum, s) => sum + (s.netWeight || 0), 0);
    const totalNetWeightYesterday = yesterdaySlips.reduce((sum, s) => sum + (s.netWeight || 0), 0);
    const totalGrossWeight = todaySlips.reduce((sum, s) => sum + (s.grossWeight || 0), 0);
    const totalTareWeight = todaySlips.reduce((sum, s) => sum + (s.tareWeight || 0), 0);
    const vehicleVisits = todaySlips.length;
    const vehicleVisitsYesterday = yesterdaySlips.length;
    const uniqueVehiclesToday = new Set(todaySlips.map((s: any) => s.vehicleId)).size;
    const avgNetWeight = totalSlipsToday > 0 ? Math.round(totalNetWeight / totalSlipsToday) : 0;

    const slipChange = totalSlipsYesterday > 0 ? Math.round(((totalSlipsToday - totalSlipsYesterday) / totalSlipsYesterday) * 100) : totalSlipsToday > 0 ? 100 : 0;
    const weightChange = totalNetWeightYesterday > 0 ? Math.round(((totalNetWeight - totalNetWeightYesterday) / totalNetWeightYesterday) * 100) : totalNetWeight > 0 ? 100 : 0;
    const visitChange = vehicleVisitsYesterday > 0 ? Math.round(((vehicleVisits - vehicleVisitsYesterday) / vehicleVisitsYesterday) * 100) : vehicleVisits > 0 ? 100 : 0;

    // Daily Trend (Last 7 Days)
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      
      const daySlips = slips.filter((s: any) => {
        const date = new Date(s.date);
        return date >= start && date <= end;
      });
      
      dailyTrend.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        netWeight: daySlips.reduce((sum, s) => sum + (s.netWeight || 0), 0),
        grossWeight: daySlips.reduce((sum, s) => sum + (s.grossWeight || 0), 0),
        slips: daySlips.length
      });
    }

    // Hourly Trend (Today)
    const hourly = [];
    for (let i = 6; i < 20; i += 2) {
      const hourSlips = todaySlips.filter((s: any) => {
        const h = new Date(s.date).getHours();
        return h >= i && h < i + 2;
      });
      hourly.push({
        name: `${i > 12 ? i - 12 : i}${i >= 12 ? 'pm' : 'am'}`,
        slips: hourSlips.length,
        weight: hourSlips.reduce((sum, s) => sum + (s.netWeight || 0), 0)
      });
    }

    // Breakdowns
    const vehicleTypeMap = new Map();
    todaySlips.forEach((s: any) => {
      const vType = s.vehicle?.vehicleType?.name || 'Unknown';
      if (!vehicleTypeMap.has(vType)) vehicleTypeMap.set(vType, { name: vType, count: 0, weight: 0 });
      const data = vehicleTypeMap.get(vType);
      data.count += 1;
      data.weight += (s.netWeight || 0);
    });
    const vehicleTypes = Array.from(vehicleTypeMap.values());

    const materialMap = new Map();
    todaySlips.forEach((s: any) => {
      const mName = s.material?.name || 'Unknown';
      if (!materialMap.has(mName)) materialMap.set(mName, { name: mName, count: 0, weight: 0 });
      const data = materialMap.get(mName);
      data.count += 1;
      data.weight += (s.netWeight || 0);
    });
    const materialBreakdown = Array.from(materialMap.values());

    const sourceMap = new Map();
    todaySlips.forEach((s: any) => {
      const sName = s.source?.name || 'Unknown';
      if (!sourceMap.has(sName)) sourceMap.set(sName, { name: sName, count: 0, weight: 0 });
      const data = sourceMap.get(sName);
      data.count += 1;
      data.weight += (s.netWeight || 0);
    });
    const sourceBreakdown = Array.from(sourceMap.values());

    const destMap = new Map();
    todaySlips.forEach((s: any) => {
      const dName = s.destination?.name || 'Unknown';
      if (!destMap.has(dName)) destMap.set(dName, { name: dName, count: 0, weight: 0 });
      const data = destMap.get(dName);
      data.count += 1;
      data.weight += (s.netWeight || 0);
    });
    const destBreakdown = Array.from(destMap.values());

    const recentSlips = todaySlips.slice(0, 5);
    const peakHour = hourly.reduce((max, h) => h.slips > max.slips ? h : max, { name: '-', slips: 0, weight: 0 });

    res.json({
      data: {
        totalSlipsToday, totalNetWeight, totalGrossWeight, totalTareWeight, vehicleVisits,
        uniqueVehiclesToday, avgNetWeight, slipChange, weightChange, visitChange,
        dailyTrend, hourly, vehicleTypes, materialBreakdown, sourceBreakdown, destBreakdown,
        recentSlips, peakHour, totalSlipsAllTime: slips.length // Approximate or we could run a real count.
      }
    });

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
