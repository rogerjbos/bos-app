// Financial data utilities for abbreviations and formatting

/**
 * Abbreviates sector and industry names for compact display
 * @param name - The full sector or industry name
 * @param type - Whether this is a 'sector' or 'industry' name
 * @returns The abbreviated name or truncated version if no abbreviation exists
 */
export const abbreviateSectorIndustry = (name: string | null, type: 'sector' | 'industry'): string => {
  if (!name) return 'N/A';

  const sectorAbbreviations: Record<string, string> = {
    'Technology': 'IT',
    'Information Technology': 'IT',
    'Health Care': 'HC',
    'Healthcare': 'HC',
    'Financials': 'FS',
    'Financial Services': 'FS',
    'Consumer Discretionary': 'CD',
    'Consumer Staples': 'CS',
    'Industrials': 'IN',
    'Energy': 'EN',
    'Materials': 'BM',
    'Real Estate': 'RE',
    'Utilities': 'UT',
    'Communication Services': 'CO',
    'Communications': 'CO',
    'Consumer Cyclical': 'CC',
    'Basic Materials': 'BM'
  };

  const industryAbbreviations: Record<string, string> = {
    'Software': 'Software',
    'Semiconductors': 'Semis',
    'Semiconductor Equipment': 'Semi Eq',
    'Internet Services': 'Internet',
    'IT Services': 'IT Svcs',
    'Application Software': 'App SW',
    'Systems Software': 'Sys SW',
    'Biotechnology': 'Biotech',
    'Pharmaceuticals': 'Pharma',
    'Drug Manufacturers': 'Drugs',
    'Medical Devices': 'Med Dev',
    'Health Care Equipment': 'HC Eq',
    'Health Care Services': 'HC Svcs',
    'Banks': 'Banks',
    'Investment Banking': 'Inv Bank',
    'Asset Management': 'Asset Mgmt',
    'Insurance': 'Insurance',
    'Credit Services': 'Credit',
    'Capital Markets': 'Cap Mkts',
    'Retail': 'Retail',
    'Apparel Retail': 'Apparel',
    'Home Improvement Retail': 'Home Imp',
    'Food Retail': 'Food Ret',
    'Automobiles': 'Auto',
    'Auto Manufacturers': 'Auto Mfg',
    'Auto Parts': 'Auto Parts',
    'Aerospace': 'Aerospace',
    'Defense': 'Defense',
    'Industrial Machinery': 'Ind Mach',
    'Construction': 'Constr',
    'Engineering': 'Eng',
    'Oil & Gas': 'Oil&Gas',
    'Integrated Oil': 'Int Oil',
    'Oil & Gas E&P': 'E&P',
    'Oil & Gas Equipment': 'Oil Eq',
    'Chemicals': 'Chem',
    'Specialty Chemicals': 'Spec Chem',
    'Building Materials': 'Build Mat',
    'Steel': 'Steel',
    'Aluminum': 'Alum',
    'Paper & Forest': 'Paper',
    'Real Estate Services': 'RE Svcs',
    'REITs': 'REITs',
    'Utilities - Regulated': 'Reg Utils',
    'Utilities - Independent': 'Ind Utils',
    'Electric Utilities': 'Electric',
    'Gas Utilities': 'Gas Utils',
    'Water Utilities': 'Water',
    'Telecom Services': 'Telecom',
    'Wireless Telecom': 'Wireless',
    'Cable & Satellite': 'Cable',
    'Media': 'Media',
    'Entertainment': 'Ent',
    'Advertising': 'Advt',
    'Publishing': 'Pub',
    'Transportation': 'Trans',
    'Airlines': 'Airlines',
    'Railroads': 'Rail',
    'Trucking': 'Trucking',
    'Marine Shipping': 'Shipping',
    'Air Freight': 'Air Frgt',
    'Packaging': 'Pack',
    'Beverages': 'Bev',
    'Food Products': 'Food',
    'Tobacco': 'Tobacco',
    'Household Products': 'HH Prod',
    'Personal Products': 'Pers Prod',
    'Textiles': 'Textiles',
    'Apparel': 'Apparel',
    'Footwear': 'Footwear',
    'Leisure Products': 'Leisure',
    'Hotels & Entertainment': 'Hotels',
    'Restaurants': 'Rests',
    'Gambling': 'Gambling'
  };

  const abbreviations = type === 'sector' ? sectorAbbreviations : industryAbbreviations;
  return abbreviations[name] || (name.length > 12 ? name.substring(0, 10) + '...' : name);
};
