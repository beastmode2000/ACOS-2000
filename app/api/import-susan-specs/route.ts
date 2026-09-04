import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROPERTY_ID = "2000";
const IMPORT_ID = "susan-marinello-specs-2017-v1";

type SpecRow = {
  id: string;
  locations: string[];
  category: string;
  item: string;
  code: string;
  details: string[];
  source: string;
};

const specs: SpecRow[] = [
  // PLUMBING — Susan Merinello Interior Specifications.pdf
  { id:"pl-p1-1", locations:["Kitchen 103"], category:"Plumbing", item:"Main Sink", code:"P-1.1", details:["Description: True Undermount Sink","Manufacturer: Waterworks","Model: KRSK30","Finish: Stainless Steel","Size: 35-3/4 x 18-1/2 x 10-5/8"], source:"Susan Merinello Interior Specifications.pdf · page 1" },
  { id:"pl-p1-2", locations:["Kitchen 103"], category:"Plumbing", item:"Main Faucet", code:"P-1.2", details:["Description: Kitchen Faucet","Manufacturer: Kallista","Line: Vir Stil Minimal by Laura Kirar","Model: P23071-00","Finish: Brushed Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 1" },
  { id:"pl-p1-3", locations:["Kitchen 103"], category:"Plumbing", item:"Garbage Disposal", code:"P-1.3", details:["Description: Food Waste Disposal","Manufacturer: InSinkErator","Line: Evolution Series","Model: Excel"], source:"Susan Merinello Interior Specifications.pdf · page 1" },
  { id:"pl-p1-4", locations:["Kitchen 103"], category:"Plumbing", item:"Hot/Cold Faucet", code:"P-1.4", details:["Description: Hot and Cold Filtration Faucet","Manufacturer: Franke","Line: Hot and Filtered Cold Water Dispenser","Model: LB3280","Finish: Satin Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 1" },
  { id:"pl-p2-1", locations:["Kitchen 103"], category:"Plumbing", item:"Prep Sink", code:"P-2.1", details:["Description: Undermount Sink with center drain","Manufacturer: Waterworks","Model: KRSK110","Finish: Stainless Steel","Size: 19-3/4 x 17-3/4 x 9-1/2"], source:"Susan Merinello Interior Specifications.pdf · page 1" },
  { id:"pl-p2-2", locations:["Kitchen 103"], category:"Plumbing", item:"Prep Faucet", code:"P-2.2", details:["Description: Entertainment Faucet","Manufacturer: Kallista","Line: Vir Stil Minimal by Laura Kirar","Model: P23072-00","Finish: Brushed Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 2" },

  { id:"pl-p4-1", locations:["Laundry E112"], category:"Plumbing", item:"Sink", code:"P-4.1", details:["Status: REUSE EXISTING"], source:"Susan Merinello Interior Specifications.pdf · page 2" },
  { id:"pl-p4-2", locations:["Laundry E112"], category:"Plumbing", item:"Faucet", code:"P-4.2", details:["Status: REUSE EXISTING"], source:"Susan Merinello Interior Specifications.pdf · page 2" },
  { id:"pl-p4-3", locations:["Laundry E112"], category:"Plumbing", item:"Garbage Disposal", code:"P-4.3", details:["Status: REUSE EXISTING"], source:"Susan Merinello Interior Specifications.pdf · page 2" },

  { id:"pl-p6-1", locations:["Nanny Bathroom 106"], category:"Plumbing", item:"Sink", code:"P-6.1", details:["Description: Undercounter Lavatory","Manufacturer: Kohler","Model: K-2214 Ladena","Finish: Vitreous China in White","Size: 20-7/8 L x 14-3/8 W x 8-1/8 D"], source:"Susan Merinello Interior Specifications.pdf · page 3" },
  { id:"pl-p6-2", locations:["Nanny Bathroom 106"], category:"Plumbing", item:"Lavatory Faucet", code:"P-6.2", details:["Description: Widespread Bathroom Sink Faucet","Manufacturer: Kohler","Model: Purist K-14406-4","Finish: Brushed Nickel (BN)"], source:"Susan Merinello Interior Specifications.pdf · page 3" },
  { id:"pl-p7", locations:["Nanny Bathroom 106"], category:"Plumbing", item:"Toilet", code:"P-7", details:["Description: One-piece High Efficiency Toilet","Manufacturer: Toto","Line: Legato","Model: MS624214CEF"], source:"Susan Merinello Interior Specifications.pdf · page 3" },
  { id:"pl-p8", locations:["Nanny Bathroom 106"], category:"Plumbing", item:"Tub/Shower Trim Set", code:"P-8", details:["Description: Rite-Temp Pressure Balance Trim Set","Manufacturer: Kohler","Line: Purist","Model: K-T14420-4","Finish: Brushed Nickel (BN)"], source:"Susan Merinello Interior Specifications.pdf · page 3" },
  { id:"pl-p9", locations:["Nanny Bathroom 106"], category:"Plumbing", item:"Bathtub", code:"P-9", details:["Description: Undermount Bathtub","Manufacturer: Zuma Collection","Model: C6634","Finish: White"], source:"Susan Merinello Interior Specifications.pdf · page 4" },

  { id:"pl-p10-1", locations:["Pool Bathroom 108"], category:"Plumbing", item:"Sink", code:"P-10.1", details:["Description: Washbasin","Manufacturer: Duravit","Model: 231980","Finish: White"], source:"Susan Merinello Interior Specifications.pdf · page 4" },
  { id:"pl-p10-2", locations:["Pool Bathroom 108"], category:"Plumbing", item:"Lavatory Faucet", code:"P-10.2", details:["Description: Single Hole Faucet","Manufacturer: Hansgrohe","Line: Axor Citterio","Model: 39010821","Finish: Satin Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 4" },
  { id:"pl-p11", locations:["Pool Bathroom 108"], category:"Plumbing", item:"Toilet", code:"P-11", details:["Description: One-piece High Efficiency Toilet","Manufacturer: Toto","Line: Legato","Model: MS624214CEF"], source:"Susan Merinello Interior Specifications.pdf · page 4" },
  { id:"pl-p12-1-trim", locations:["Pool Bathroom 108"], category:"Plumbing", item:"Thermostatic Trim with Volume Control", code:"P-12.1", details:["Manufacturer: Hansgrohe","Line: Axor Citterio","Model: 39700821","Finish: Satin Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 4" },
  { id:"pl-p12-1-head", locations:["Pool Bathroom 108"], category:"Plumbing", item:"Shower Head", code:"P-12.1", details:["Description: Raindance Showerhead","Manufacturer: Hansgrohe","Line: Raindance S 150 AIR 1-jet Showerhead","Finish: Brushed Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 5" },
  { id:"pl-p12-2", locations:["Pool Bathroom 108"], category:"Plumbing", item:"Shower Drain", code:"P-12.2", details:["Description: Cast Iron Shower Drain","Manufacturer: Zurn","Line: Light Commercial","Model: FD2254-CI-SS-CP","Finish: Polished Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 5" },

  { id:"pl-p13-1", locations:["Master Bathroom 208"], category:"Plumbing", item:"Sink Faucet", code:"P-13.1", details:["Description: One Basin Faucet Set","Manufacturer: Kallista","Line: One","Model: P24492-CR","Finish: Nickel Silver"], source:"Susan Merinello Interior Specifications.pdf · page 5" },
  { id:"pl-p13-2", locations:["Master Bathroom 208"], category:"Plumbing", item:"Sink", code:"P-13.2", details:["Description: Undercounter Lavatory","Manufacturer: Kohler","Model: K-2214 Ladena","Finish: Vitreous China in White","Size: 20-7/8 L x 14-3/8 W x 8-1/8 D"], source:"Susan Merinello Interior Specifications.pdf · page 5" },
  { id:"pl-p14", locations:["Master Bathroom 208"], category:"Plumbing", item:"Toilet", code:"P-14", details:["Description: Neorest 750H Dual Flush Toilet","Manufacturer: Toto","Line: Neorest 750H Dual Flush Toilet","Model: MS993CUMFX#01","Finish: #01 Cotton"], source:"Susan Merinello Interior Specifications.pdf · page 5" },
  { id:"pl-p15-1", locations:["Master Bathroom 208"], category:"Plumbing", item:"Bathtub", code:"P-15.1", details:["Description: Undermount Bathtub","Manufacturer: Kohler","Model: K-855-0","Finish: White"], source:"Susan Merinello Interior Specifications.pdf · page 6" },
  { id:"pl-p15-2", locations:["Master Bathroom 208"], category:"Plumbing", item:"Bathtub Filler", code:"P-15.2", details:["Description: Deck Mounted Bath Faucet","Manufacturer: Kallista","Line: One","Model: P24485-CR","Finish: Nickel Silver"], source:"Susan Merinello Interior Specifications.pdf · page 6" },
  { id:"pl-p16-1", locations:["Master Bathroom 208"], category:"Plumbing", item:"Shower Head", code:"P-16.1", details:["Description: Raindome","Manufacturer: Kallista","Line: One","Finish: Nickel Silver"], source:"Susan Merinello Interior Specifications.pdf · page 6" },
  { id:"pl-p16-2", locations:["Master Bathroom 208"], category:"Plumbing", item:"Shower Arm", code:"P-16.2", details:["Manufacturer: Kallista","Line: One","Model: P24476-00","Finish: Nickel Silver"], source:"Susan Merinello Interior Specifications.pdf · page 6" },
  { id:"pl-p16-3", locations:["Master Bathroom 208"], category:"Plumbing", item:"Volume Control", code:"P-16.3", details:["Description: Volume Control Valve","Manufacturer: Kallista","Line: One","Finish: Nickel Silver"], source:"Susan Merinello Interior Specifications.pdf · page 6" },
  { id:"pl-p16-4", locations:["Master Bathroom 208"], category:"Plumbing", item:"Thermostatic Valve Control", code:"P-16.4", details:["Description: Thermostatic Valve Trim","Manufacturer: Kallista","Line: One","Model: P24421-CR","Finish: Nickel Silver"], source:"Susan Merinello Interior Specifications.pdf · page 7" },
  { id:"pl-p16-5", locations:["Master Bathroom 208"], category:"Plumbing", item:"Hand Shower Slider Bar", code:"P-16.5", details:["Description: Slidebar","Manufacturer: Kallista","Line: One","Finish: Nickel Silver"], source:"Susan Merinello Interior Specifications.pdf · page 7" },
  { id:"pl-p16-6", locations:["Master Bathroom 208"], category:"Plumbing", item:"Hand Shower", code:"P-16.6", details:["Description: Water Dual Function Handshower with hose","Manufacturer: Kallista","Line: One","Model: P24443-00","Finish: Nickel Silver"], source:"Susan Merinello Interior Specifications.pdf · page 7" },
  { id:"pl-p16-7", locations:["Master Bathroom 208"], category:"Plumbing", item:"Shower Drain", code:"P-16.7", details:["Description: Linear Shower Drain","Manufacturer: QuickDrain USA","Line: Proline linear drain","Model/Length: TBD","Finish: TBD"], source:"Susan Merinello Interior Specifications.pdf · page 7" },

  { id:"pl-p17-1", locations:["Micah's Bathroom E207"], category:"Plumbing", item:"Sink", code:"P-17.1", details:["Description: Undercounter Lavatory","Manufacturer: Kohler","Model: K-2214 Ladena","Finish: Vitreous China in White"], source:"Susan Merinello Interior Specifications.pdf · page 7" },
  { id:"pl-p17-2", locations:["Micah's Bathroom E207"], category:"Plumbing", item:"Lavatory Faucet", code:"P-17.2", details:["Description: Widespread Bathroom Sink Faucet","Manufacturer: Kohler","Line: Purist","Model: K-14406-4","Finish: Brushed Nickel (BN)"], source:"Susan Merinello Interior Specifications.pdf · page 8" },
  { id:"pl-p18", locations:["Micah's Bathroom E207"], category:"Plumbing", item:"Toilet", code:"P-18", details:["Description: One-piece High Efficiency Toilet","Manufacturer: Toto","Line: Legato","Model: MS624214CEF"], source:"Susan Merinello Interior Specifications.pdf · page 8" },
  { id:"pl-p19-1", locations:["Micah's Bathroom E207"], category:"Plumbing", item:"Shower Head", code:"P-19.1", details:["Description: Multifunction Wall Mount Showerhead","Manufacturer: Kohler","Line: Purist","Finish: Brushed Nickel (BN)"], source:"Susan Merinello Interior Specifications.pdf · page 8" },
  { id:"pl-p19-2", locations:["Micah's Bathroom E207"], category:"Plumbing", item:"Shower Trim Set", code:"P-19.2", details:["Description: Rite-Temp Pressure Balance Valve","Manufacturer: Kohler","Line: Purist","Finish: Brushed Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 8" },
  { id:"pl-p19-3", locations:["Micah's Bathroom E207"], category:"Plumbing", item:"Shower Drain", code:"P-19.3", details:["Description: Cast Iron Shower Drain","Manufacturer: Zurn","Line: Light Commercial","Model: FD2254-CI-SS-CP","Finish: Polished Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 8" },

  { id:"pl-p20-1", locations:["Elliott & Elan's Bathroom 205"], category:"Plumbing", item:"Sink", code:"P-20.1", details:["Description: Undercounter Lavatory","Manufacturer: Kohler","Model: K-2214 Ladena","Finish: Vitreous China in White"], source:"Susan Merinello Interior Specifications.pdf · page 9" },
  { id:"pl-p20-2", locations:["Elliott & Elan's Bathroom 205"], category:"Plumbing", item:"Lavatory Faucet", code:"P-20.2", details:["Description: Widespread Bathroom Sink Faucet","Manufacturer: Kohler","Line: Purist","Model: K-14406-4","Finish: Brushed Nickel (BN)"], source:"Susan Merinello Interior Specifications.pdf · page 9" },
  { id:"pl-p21", locations:["Elliott & Elan's Bathroom 205"], category:"Plumbing", item:"Toilet", code:"P-21", details:["Description: One-piece High Efficiency Toilet","Manufacturer: Toto","Line: Legato","Model: MS624214CEF"], source:"Susan Merinello Interior Specifications.pdf · page 9" },
  { id:"pl-p22", locations:["Elliott & Elan's Bathroom 205"], category:"Plumbing", item:"Shower Trim Set", code:"P-22", details:["Manufacturer: Kohler","Line: Purist","Model: K-T14420-4","Finish: Brushed Nickel (BN)"], source:"Susan Merinello Interior Specifications.pdf · page 9" },
  { id:"pl-p24", locations:["Elliott & Elan's Bathroom 205"], category:"Plumbing", item:"Shower Base", code:"P-24", details:["Finish: White","Model: TBD"], source:"Susan Merinello Interior Specifications.pdf · page 9" },
  { id:"pl-p24-1-drain", locations:["Elliott & Elan's Bathroom 205"], category:"Plumbing", item:"Shower Drain", code:"P-24.1", details:["Description: Cast Iron Shower Drain","Manufacturer: Zurn","Line: Light Commercial","Model: FD2254-CI-SS-CP","Finish: Polished Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 10" },

  { id:"pl-p24-1-evi", locations:["Evi's Bathroom 201"], category:"Plumbing", item:"Sink", code:"P-24.1", details:["Description: Undercounter Lavatory","Manufacturer: Kohler","Model: K-2214 Ladena","Finish: Vitreous China in White"], source:"Susan Merinello Interior Specifications.pdf · page 10" },
  { id:"pl-p24-2-evi", locations:["Evi's Bathroom 201"], category:"Plumbing", item:"Lavatory Faucet", code:"P-24.2", details:["Description: Widespread Faucet","Manufacturer: Brizo","Line: Rook","Finish: Luxe Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 10" },
  { id:"pl-p25", locations:["Evi's Bathroom 201"], category:"Plumbing", item:"Toilet", code:"P-25", details:["Description: One-piece High Efficiency Toilet","Manufacturer: Toto","Line: Legato","Model: MS624214CEF"], source:"Susan Merinello Interior Specifications.pdf · page 10" },
  { id:"pl-p26-1", locations:["Evi's Bathroom 201"], category:"Plumbing", item:"Shower / Tub Set", code:"P-26.1", details:["Description: TempAssure Thermostatic Tub/Shower","Manufacturer: Brizo","Line: Rook","Finish: Luxe Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 10" },
  { id:"pl-p27", locations:["Evi's Bathroom 201"], category:"Plumbing", item:"Bathtub", code:"P-27", details:["Description: Undermount Bathtub","Manufacturer: Zuma Collection","Model: C6634","Finish: White"], source:"Susan Merinello Interior Specifications.pdf · page 11" },

  { id:"pl-p28-poolbar", locations:["Pool Bar 109"], category:"Plumbing", item:"Sink", code:"P-28", details:["Description: Undermount Sink","Manufacturer: Waterworks","Finish: Stainless Steel"], source:"Susan Merinello Interior Specifications.pdf · page 11" },
  { id:"pl-p29-poolbar", locations:["Pool Bar 109"], category:"Plumbing", item:"Faucet", code:"P-29", details:["Description: Kitchen Faucet","Manufacturer: Kallista","Line: Vir Stil Minimal by Laura Kirar","Model: P23071-00","Finish: Brushed Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 11" },
  { id:"pl-p28-masterbed", locations:["Master Bedroom 200"], category:"Plumbing", item:"Sink", code:"P-28", details:["Description: Undermount Sink","Manufacturer: Kohler","Line: Iron Tones","Finish: Ice Grey"], source:"Susan Merinello Interior Specifications.pdf · page 11" },
  { id:"pl-p29-masterbed", locations:["Master Bedroom 200"], category:"Plumbing", item:"Faucet", code:"P-29", details:["Description: One Pull-down Kitchen Faucet","Manufacturer: Kallista","Line: One","Finish: Brushed Nickel"], source:"Susan Merinello Interior Specifications.pdf · page 11" },

  // PAINT — Susan Marinello Interior Specifications Paint List.pdf
  { id:"pt-06", locations:["Kitchen 103","Breakfast E110","Family Room E111"], category:"Paint", item:"Wall Paint", code:"PT-06", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 2" },
  { id:"pt-07", locations:["Play Room 101"], category:"Paint", item:"Wall Paint", code:"PT-07", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 2" },
  { id:"pt-08", locations:["Laundry E112"], category:"Paint", item:"Wall Paint", code:"PT-08", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 2" },
  { id:"pt-09", locations:["Artroom"], category:"Paint", item:"Wall Paint", code:"PT-09", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 2" },
  { id:"pt-10", locations:["Video E106"], category:"Paint", item:"Wall Paint", code:"PT-10", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 2" },
  { id:"pt-11", locations:["Mudroom E114"], category:"Paint", item:"Wall Paint", code:"PT-11", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 3" },
  { id:"pt-12", locations:["Nanny's Room 105"], category:"Paint", item:"Wall Paint", code:"PT-12", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 3" },
  { id:"pt-13", locations:["Nanny Bathroom 106"], category:"Paint", item:"Wall Paint", code:"PT-13", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell","Source extent is printed as Nanny's Bathroom 105 on the schedule."], source:"susan merinello interior specifications Paint List.pdf · page 3" },
  { id:"pt-14", locations:["Exercise Room 107"], category:"Paint", item:"Wall Paint", code:"PT-14", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 3" },
  { id:"pt-15", locations:["Pool Bathroom 108"], category:"Paint", item:"Wall Paint", code:"PT-15", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 3" },
  { id:"pt-16", locations:["Pool Room 109"], category:"Paint", item:"Wall Paint", code:"PT-16", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 4" },
  { id:"pt-17", locations:["Micah's Bedroom E208"], category:"Paint", item:"Wall Paint", code:"PT-17", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 4" },
  { id:"pt-18", locations:["Micah's Bathroom E207"], category:"Paint", item:"Wall Paint", code:"PT-18", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 4" },
  { id:"pt-19-bed", locations:["Evi's Bedroom 203"], category:"Paint", item:"Wall Paint", code:"PT-19", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 4" },
  { id:"pt-19-bath", locations:["Evi's Bathroom 201"], category:"Paint", item:"Wall Paint", code:"PT-19", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 4" },
  { id:"pt-20", locations:["Elliott's Bedroom 206"], category:"Paint", item:"Wall Paint", code:"PT-20", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 4" },
  { id:"pt-21", locations:["Elan's Bedroom 204"], category:"Paint", item:"Wall Paint", code:"PT-21", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 5" },
  { id:"pt-22", locations:["Elliott & Elan's Bathroom 205"], category:"Paint", item:"Wall Paint", code:"PT-22", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 5" },
  { id:"pt-23", locations:["Master Bedroom 209"], category:"Paint", item:"Wall Paint", code:"PT-23", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 5" },
  { id:"pt-24", locations:["Master Bathroom 208"], category:"Paint", item:"Wall Paint", code:"PT-24", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 5" },
  { id:"pt-25", locations:["Master Dressing Room 207"], category:"Paint", item:"Wall Paint", code:"PT-25", details:["Manufacturer: Benjamin Moore","Description: Regal WallSatin Latex Paint","Sheen: Eggshell"], source:"susan merinello interior specifications Paint List.pdf · page 5" },

  // STONE
  { id:"st-01-kitchen", locations:["Kitchen 103","Pantry E109"], category:"Stone / Countertop", item:"Countertop", code:"ST-01", details:["Manufacturer/Supplier: Caesarstone Quartz","Material/Color: Calacatta Nuvo 5131","Size: 3 cm","Finish: Polished","Edge: Square Eased"], source:"susan merinello interior specifications Paint List.pdf · page 6" },
  { id:"st-02", locations:["Master Bathroom 208"], category:"Stone / Countertop", item:"Countertop / Backsplash / Thresholds / Shower Jamb / Tub Deck & Apron", code:"ST-02", details:["Manufacturer/Supplier: Ann Sacks","Material/Color: Reve Blue","Size: 3 cm","Finish: Honed","Edge: Square Eased"], source:"susan merinello interior specifications Paint List.pdf · page 6" },
  { id:"st-03", locations:["Micah's Bathroom E207"], category:"Stone / Countertop", item:"Countertop / Thresholds / Shower Jamb", code:"ST-03", details:["Manufacturer/Supplier: Pental Surfaces","Material/Color: Misterio Polished","Size: 3 cm","Finish: Polished","Edge: Square Eased"], source:"susan merinello interior specifications Paint List.pdf · page 6" },
  { id:"st-04", locations:["Elliott & Elan's Bathroom 205"], category:"Stone / Countertop", item:"Countertop / Backsplash / Thresholds / Tub Deck", code:"ST-04", details:["Manufacturer/Supplier: Pental Surfaces","Material/Color: Carrara Polished","Size: 3 cm","Finish: Polished","Edge: Square Eased"], source:"susan merinello interior specifications Paint List.pdf · page 6" },
  { id:"st-05", locations:["Evi's Bathroom 201"], category:"Stone / Countertop", item:"Countertop / Backsplash / Thresholds / Tub Deck", code:"ST-05", details:["Manufacturer/Supplier: Pental Surfaces","Material/Color: Bianco Carrara","Size: 3 cm","Finish: Honed","Edge: Square Eased"], source:"susan merinello interior specifications Paint List.pdf · page 7" },
  { id:"st-06", locations:["Nanny Bathroom 106"], category:"Stone / Countertop", item:"Countertop / Backsplash / Thresholds / Tub Deck", code:"ST-06", details:["Manufacturer/Supplier: Caesarstone Quartz","Material/Color: 5211 Noble Grey","Size: 3 cm","Finish: Polished","Edge: Square Eased"], source:"susan merinello interior specifications Paint List.pdf · page 7" },
  { id:"st-07", locations:["Nanny's Room 105"], category:"Stone / Countertop", item:"Countertop / Backsplash", code:"ST-07", details:["Manufacturer/Supplier: Pental Surfaces","Material/Color: Ondulato Polished","Size: 3 cm","Finish: Polished","Edge: Square Eased"], source:"susan merinello interior specifications Paint List.pdf · page 7" },
  { id:"st-08", locations:["Laundry E112"], category:"Stone / Countertop", item:"Countertop / Backsplash", code:"ST-08", details:["Manufacturer/Supplier: Pental Surfaces","Material/Color: Statuario","Size: 3 cm","Finish: Polished","Edge: Square Eased"], source:"susan merinello interior specifications Paint List.pdf · page 7" },
  { id:"st-09", locations:["Pool Room 109"], category:"Stone / Countertop", item:"Countertop / Backsplash", code:"ST-09", details:["Manufacturer/Supplier: Pental Surfaces","Material/Color: Ondulato Polished","Size: 3 cm","Finish: Polished","Edge: Square Eased"], source:"susan merinello interior specifications Paint List.pdf · page 8" },
  { id:"st-10", locations:["Pool Bathroom 108"], category:"Stone / Countertop", item:"Countertop / Backsplash / Thresholds / Shower Jamb", code:"ST-10", details:["Manufacturer/Supplier: Pental Surfaces","Material/Color: Ondulato Polished","Size: 3 cm","Finish: Polished","Edge: Square Eased"], source:"susan merinello interior specifications Paint List.pdf · page 8" },
  { id:"st-11", locations:["Outdoor Dining BBQ 104"], category:"Stone / Countertop", item:"Countertop / Backsplash", code:"ST-11", details:["Specification: TBD"], source:"susan merinello interior specifications Paint List.pdf · page 8" },

  // TILE
  { id:"ti-01", locations:["Master Bathroom 208"], category:"Tile", item:"Tile Flooring", code:"TI-01", details:["Supplier: Ann Sacks","Material: Reve Blue","Finish: Honed","Size: 16 x 16","Pattern: Offset"], source:"susan merinello interior specifications Paint List.pdf · page 8" },
  { id:"ti-02", locations:["Master Bathroom 208"], category:"Tile", item:"Wall & Shower Tile", code:"TI-02", details:["Supplier: Ann Sacks","Material: Reve Blue","Finish: Honed","Size: 16 x 16","Pattern: Offset"], source:"susan merinello interior specifications Paint List.pdf · page 9" },
  { id:"ti-03", locations:["Master Bathroom 208"], category:"Tile", item:"Shower Floor & Ceiling Mosaic", code:"TI-03", details:["Supplier: Ann Sacks","Material: Reve Blue","Finish: Honed","Size: 4 x 4","Pattern: Offset"], source:"susan merinello interior specifications Paint List.pdf · page 9" },
  { id:"ti-04", locations:["Micah's Bathroom E207"], category:"Tile", item:"Tile Flooring", code:"TI-04", details:["Supplier: Ann Sacks","Material: Paris Perinea AS7683","Pattern: Offset"], source:"susan merinello interior specifications Paint List.pdf · page 9" },
  { id:"ti-micah-base", locations:["Micah's Bathroom E207"], category:"Tile", item:"Tile Base", code:"n/a", details:["Note: Painted wood base to match vanity"], source:"susan merinello interior specifications Paint List.pdf · page 9" },
  { id:"ti-micah-shower-floor", locations:["Micah's Bathroom E207"], category:"Tile", item:"Shower Floor", code:"n/a", details:["Note: Maxx B3 shower base; contractor to verify"], source:"susan merinello interior specifications Paint List.pdf · page 10" },
  { id:"ti-05", locations:["Micah's Bathroom E207"], category:"Tile", item:"Shower Wall Tile", code:"TI-05", details:["Supplier: Terra Sol","Material: Marezzo Soil Series","Finish: White Matte Trace","Size: 10 x 30","Pattern: On grid"], source:"susan merinello interior specifications Paint List.pdf · page 10" },
  { id:"ti-06", locations:["Elliott & Elan's Bathroom 205"], category:"Tile", item:"Tile Flooring", code:"TI-06", details:["Supplier: Porcelanosa","Material: Ferroker Niquel V5460004","Size: 18 x 18","Pattern: On grid"], source:"susan merinello interior specifications Paint List.pdf · page 10" },
  { id:"ti-ee-base", locations:["Elliott & Elan's Bathroom 205"], category:"Tile", item:"Tile Base", code:"n/a", details:["Note: Painted wood base to match vanity"], source:"susan merinello interior specifications Paint List.pdf · page 10" },
  { id:"ti-07", locations:["Elliott & Elan's Bathroom 205"], category:"Tile", item:"Tub / Shower Wall Tile", code:"TI-07", details:["Supplier: Porcelanosa","Material: Park Lineal Silver P34707231","Size: 12 x 35","Pattern: On grid"], source:"susan merinello interior specifications Paint List.pdf · page 11" },
  { id:"ti-08", locations:["Evi's Bathroom 201"], category:"Tile", item:"Tile Flooring", code:"TI-08", details:["Supplier: Statements","Material: Bianco Carrara","Finish: Honed","Size: 12 x 12","Pattern: On grid"], source:"susan merinello interior specifications Paint List.pdf · page 11" },
  { id:"ti-evi-base", locations:["Evi's Bathroom 201"], category:"Tile", item:"Tile Base", code:"n/a", details:["Note: Painted wood base to match vanity"], source:"susan merinello interior specifications Paint List.pdf · page 11" },
  { id:"ti-09", locations:["Evi's Bathroom 201"], category:"Tile", item:"Tub / Shower Wall Tile", code:"TI-09", details:["Supplier: Porcelanosa","Material: Glass Bianco P34704611","Size: 12 x 35","Pattern: Offset"], source:"susan merinello interior specifications Paint List.pdf · page 11" },
  { id:"ti-10", locations:["Nanny Bathroom 106"], category:"Tile", item:"Tile Flooring", code:"TI-10", details:["Material: Silver Fir Matte","Size: 8 x 36","Pattern: On grid"], source:"susan merinello interior specifications Paint List.pdf · page 12" },
  { id:"ti-nanny-base", locations:["Nanny Bathroom 106"], category:"Tile", item:"Tile Base", code:"n/a", details:["Note: Painted wood base to match vanity"], source:"susan merinello interior specifications Paint List.pdf · page 12" },
  { id:"ti-11", locations:["Nanny Bathroom 106"], category:"Tile", item:"Tub / Shower Wall Tile, Tub Deck & Apron", code:"TI-11", details:["Supplier: Pental Surfaces","Material: Evolve Ice","Finish: Matte","Size: 12 x 24","Pattern: On grid"], source:"susan merinello interior specifications Paint List.pdf · page 12" },
  { id:"ti-12", locations:["Pool Bathroom 108"], category:"Tile", item:"Tile Flooring", code:"TI-12", details:["Specification: TBD","Note: Concrete per contractor"], source:"susan merinello interior specifications Paint List.pdf · page 12" },
  { id:"ti-13", locations:["Pool Bathroom 108"], category:"Tile", item:"Tile Base", code:"TI-13", details:["Note: Painted wood base to match vanity"], source:"susan merinello interior specifications Paint List.pdf · page 13" },
  { id:"ti-14", locations:["Pool Bathroom 108"], category:"Tile", item:"Shower Floor & Toilet Room", code:"TI-14", details:["Supplier: Pental Surfaces","Material: Atlas Concorde Mark","Finish: Strutturato Pearl Textured","Size: 12 x 12","Pattern: On grid"], source:"susan merinello interior specifications Paint List.pdf · page 13" },
  { id:"ti-15", locations:["Pool Bathroom 108"], category:"Tile", item:"Shower Wall Tile", code:"TI-15", details:["Supplier: Pental Surfaces","Material: Atlas Concorde Mark","Finish: Strutturato Pearl Matte","Size: 12 x 24"], source:"susan merinello interior specifications Paint List.pdf · page 13" },
  { id:"ti-16", locations:["Pool 109"], category:"Tile", item:"Coping", code:"TI-16", details:["Specification: TBD"], source:"susan merinello interior specifications Paint List.pdf · page 13" },
  { id:"ti-17", locations:["Pool 109"], category:"Tile", item:"Pool Tile", code:"TI-17", details:["Specification: TBD"], source:"susan merinello interior specifications Paint List.pdf · page 14" },

  // WOOD / CARPET
  { id:"wd-01", locations:["Main Flooring"], category:"Flooring", item:"Wood Flooring", code:"WD-01", details:["Material: Match existing","Supplier: Per contractor recommendation","Species: Match existing","Stain: Match existing","Finish: Match existing","Size: Match existing"], source:"susan merinello interior specifications Paint List.pdf · page 14" },
  { id:"wd-02", locations:["Upper Level"], category:"Flooring", item:"Wood Flooring", code:"WD-02", details:["Material: Match existing","Supplier: Per contractor recommendation","Species: Match existing","Stain: Match existing","Finish: Match existing","Size: Match existing"], source:"susan merinello interior specifications Paint List.pdf · page 14" },
  { id:"wd-03", locations:["Exercise Room 107"], category:"Flooring", item:"Wood Flooring", code:"WD-03", details:["Material: Engineered Bamboo","Supplier: Per contractor recommendation","Species: Bamboo","Stain: To match SMI control sample","Finish: To match SMI control sample","Size: TBD"], source:"susan merinello interior specifications Paint List.pdf · page 14" },
  { id:"wd-05", locations:["Master Closet"], category:"Millwork / Casework", item:"Wood Casework", code:"WD-05", details:["Item: Master Closet","Species: Rift White Oak","Stain: To match SMI control sample","Finish: To match SMI control sample","Note: Face frame trim, door and drawer fronts"], source:"susan merinello interior specifications Paint List.pdf · page 15" },
  { id:"wd-05-alt", locations:["Master Closet"], category:"Millwork / Casework", item:"Wood Casework — Cost Alternate", code:"WD-05 ALT", details:["Item: Master Closet","Species: Paint Grade Clear Maple","Paint: TBD","Sheen: Satin","Note: Cost alternate to WD-05; most cost effective finish choice"], source:"susan merinello interior specifications Paint List.pdf · page 15" },
  { id:"cpt-01-nanny", locations:["Nanny's Room 105"], category:"Flooring", item:"Carpet", code:"CPT-01", details:["Manufacturer: Altim Carpets, USA Ltd.","Style: Wall-to-wall carpet","Color/Model: Woolridge #2218","Note: Contractor to install Heather Choice 5/16 Blue Pad"], source:"susan merinello interior specifications Paint List.pdf · page 16" },
  { id:"cpt-01-play", locations:["Play Room 101"], category:"Flooring", item:"Carpet", code:"CPT-01", details:["Manufacturer: Altim Carpets, USA Ltd.","Style: Wall-to-wall carpet","Color/Model: Woolridge #2218","Note: Contractor to install Heather Choice 5/16 Blue Pad"], source:"susan merinello interior specifications Paint List.pdf · page 16" },
  { id:"cpt-02", locations:["Carpet Stair Runner"], category:"Flooring", item:"Carpet Stair Runner", code:"CPT-02", details:["Specification: TBD"], source:"susan merinello interior specifications Paint List.pdf · page 16" },
];

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || "";
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function detailFor(spec: SpecRow) {
  return {
    id: `susan-${spec.id}`,
    label: `${spec.category} · ${spec.item}`,
    value: [
      `Spec Code: ${spec.code}`,
      "Status: Specified",
      ...spec.details,
      `Source: ${spec.source}`,
    ].join("\n"),
  };
}

function typeForLocation(name: string) {
  if (/bathroom/i.test(name)) return "Bathroom";
  if (/bedroom|nanny'?s room/i.test(name)) return "Bedroom";
  if (/kitchen/i.test(name)) return "Kitchen";
  if (/pool/i.test(name)) return "Area";
  return "Room / Area";
}

async function ensureLocationColumns(sql: ReturnType<typeof neon>) {
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS parent_id text`;
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS custom_details jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS vendor_ids text[] NOT NULL DEFAULT '{}'`;
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0`;
}

async function verification(sql: ReturnType<typeof neon>) {
  const expectedByName = new Map<string, Set<string>>();
  for (const spec of specs) {
    for (const locationName of spec.locations) {
      const key = slug(locationName);
      if (!expectedByName.has(key)) expectedByName.set(key, new Set<string>());
      expectedByName.get(key)!.add(`susan-${spec.id}`);
    }
  }

  const rows = await sql`
    SELECT id, name, custom_details
    FROM atlas_locations
    WHERE property_id = ${PROPERTY_ID}
  `;

  let verifiedLocations = 0;
  let verifiedDetails = 0;
  const missingLocations: string[] = [];
  const missingDetails: Array<{ location: string; count: number }> = [];

  for (const [nameKey, expectedIds] of expectedByName.entries()) {
    const expectedName = Array.from(new Set(specs.flatMap((spec) => spec.locations)))
      .find((name) => slug(name) === nameKey) || nameKey;
    const row = (rows as any[]).find((item) => slug(String(item.name || "")) === nameKey);
    if (!row) {
      missingLocations.push(expectedName);
      continue;
    }
    verifiedLocations += 1;
    const details = Array.isArray(row.custom_details) ? row.custom_details : [];
    const presentIds = new Set(details.map((detail: any) => String(detail?.id || "")));
    let present = 0;
    for (const id of expectedIds) if (presentIds.has(id)) present += 1;
    verifiedDetails += present;
    if (present !== expectedIds.size) {
      missingDetails.push({ location: expectedName, count: expectedIds.size - present });
    }
  }

  return {
    verifiedLocations,
    verifiedDetails,
    expectedLocations: expectedByName.size,
    expectedDetails: specs.reduce((total, spec) => total + spec.locations.length, 0),
    missingLocations,
    missingDetails,
    complete:
      missingLocations.length === 0 &&
      missingDetails.length === 0,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    propertyId: PROPERTY_ID,
    importId: IMPORT_ID,
    sourcePages: 27,
    specificationRows: specs.length,
    expectedLocations: new Set(specs.flatMap((item) => item.locations.map(slug))).size,
    expectedDetails: specs.reduce((total, spec) => total + spec.locations.length, 0),
  });
}

export async function POST() {
  try {
    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      return NextResponse.json(
        { ok: false, error: "Atlas database is not connected." },
        { status: 503 },
      );
    }

    const sql = neon(databaseUrl);
    await ensureLocationColumns(sql);

    const FINAL_IMPORT_ID = "susan-marinello-specs-2017-atlas-locations-v3";
    const existingFinal = await sql`
      SELECT id, record
      FROM atlas_operational_records
      WHERE record_type = 'system_migration'
        AND id = ${FINAL_IMPORT_ID}
        AND property_id = ${PROPERTY_ID}
      LIMIT 1
    `;

    if (existingFinal[0]) {
      const check = await verification(sql);
      return NextResponse.json({
        ok: true,
        alreadyImported: true,
        sourcePages: 27,
        specificationRows: specs.length,
        specificationDetailsAdded: 0,
        locationsCreated: [],
        locationsCreatedCount: 0,
        locationsUpdatedCount: 0,
        ...check,
        message: check.complete
          ? "All Susan Marinello room specifications are already visible in Atlas Locations."
          : "The prior import marker exists, but verification found missing Atlas Location data. Remove the v3 marker before retrying.",
      });
    }

    const currentRows = await sql`
      SELECT id, name, type, zone, notes, parent_id, custom_details, vendor_ids, sort_order
      FROM atlas_locations
      WHERE property_id = ${PROPERTY_ID}
      ORDER BY sort_order ASC, name ASC
    `;

    const current = (currentRows as any[]).map((row) => ({
      id: String(row.id || ""),
      name: String(row.name || ""),
      type: String(row.type || ""),
      zone: String(row.zone || ""),
      notes: String(row.notes || ""),
      parentId: String(row.parent_id || ""),
      customDetails: Array.isArray(row.custom_details) ? row.custom_details : [],
      vendorIds: Array.isArray(row.vendor_ids) ? row.vendor_ids.map(String) : [],
      sortOrder: Number(row.sort_order || 0),
    }));

    const targetNames = Array.from(new Set(specs.flatMap((item) => item.locations)));
    const locationByTarget = new Map<string, { id: string; name: string; customDetails: any[]; created: boolean }>();
    const locationsCreated: string[] = [];
    const updatedLocationIds = new Set<string>();
    let specificationDetailsAdded = 0;

    for (const target of targetNames) {
      const exact = current.find((item) => slug(item.name) === slug(target));
      if (exact) {
        locationByTarget.set(target, {
          id: exact.id,
          name: exact.name,
          customDetails: [...exact.customDetails],
          created: false,
        });
        continue;
      }

      const id = `susan-2000-location-${slug(target)}`;
      await sql`
        INSERT INTO atlas_locations (
          id,
          name,
          type,
          zone,
          notes,
          parent_id,
          custom_details,
          vendor_ids,
          sort_order,
          property_id
        ) VALUES (
          ${id},
          ${target},
          ${typeForLocation(target)},
          '',
          '',
          ${null},
          '[]'::jsonb,
          ${[] as string[]},
          0,
          ${PROPERTY_ID}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          property_id = EXCLUDED.property_id
      `;

      const created = {
        id,
        name: target,
        type: typeForLocation(target),
        zone: "",
        notes: "",
        parentId: "",
        customDetails: [] as any[],
        vendorIds: [] as string[],
        sortOrder: 0,
      };
      current.push(created);
      locationByTarget.set(target, {
        id,
        name: target,
        customDetails: [],
        created: true,
      });
      locationsCreated.push(target);
    }

    for (const spec of specs) {
      for (const target of spec.locations) {
        const location = locationByTarget.get(target);
        if (!location) continue;

        const detail = detailFor(spec);
        if (location.customDetails.some((item: any) => String(item?.id || "") === detail.id)) {
          continue;
        }

        location.customDetails.push(detail);
        specificationDetailsAdded += 1;
        updatedLocationIds.add(location.id);
      }
    }

    for (const location of locationByTarget.values()) {
      if (!updatedLocationIds.has(location.id)) continue;
      await sql`
        UPDATE atlas_locations
        SET custom_details = ${JSON.stringify(location.customDetails)}::jsonb
        WHERE id = ${location.id}
          AND property_id = ${PROPERTY_ID}
      `;
    }

    const check = await verification(sql);

    if (!check.complete) {
      return NextResponse.json(
        {
          ok: false,
          error: "The import wrote to Atlas Locations but verification found missing rooms or specification details.",
          sourcePages: 27,
          specificationRows: specs.length,
          specificationDetailsAdded,
          locationsCreated,
          locationsCreatedCount: locationsCreated.length,
          locationsUpdatedCount: updatedLocationIds.size - locationsCreated.length,
          ...check,
        },
        { status: 500 },
      );
    }

    const result = {
      importedAt: new Date().toISOString(),
      sourcePages: 27,
      specificationRows: specs.length,
      specificationDetailsAdded,
      locationsCreated,
      locationsCreatedCount: locationsCreated.length,
      locationsUpdatedCount: updatedLocationIds.size - locationsCreated.length,
      ...check,
    };

    await sql`
      INSERT INTO atlas_operational_records (record_type, id, property_id, record, updated_at)
      VALUES (
        'system_migration',
        ${FINAL_IMPORT_ID},
        ${PROPERTY_ID},
        ${JSON.stringify(result)}::jsonb,
        NOW()
      )
      ON CONFLICT (record_type, id) DO NOTHING
    `;

    return NextResponse.json({
      ok: true,
      alreadyImported: false,
      ...result,
      message: `Verified ${check.verifiedLocations} locations and ${check.verifiedDetails} room-specification details in Atlas Locations.`,
    });
  } catch (error) {
    console.error("Susan Marinello specification import failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not import the Susan Marinello specifications." },
      { status: 500 },
    );
  }
}
