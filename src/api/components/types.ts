export type ComponentType = "pv_module";

export interface ComponentsQueryParams {
  skip?: number;
  limit?: number;
  type?: ComponentType;
  search?: string;
  is_active?: boolean;
}

export interface ComponentsPage<TComponent> {
  items: TComponent[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ComponentBase<TType extends ComponentType = ComponentType> {
  type: TType;
  manufacturer: string;
  region: string | null;
  series: string | null;
  model: string;
  description: string | null;
  datasheet_url: string | null;
  image_url: string | null;
  component_id: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PvModuleElectricalSpecs {
  isc_a?: number;
  voc_v?: number;
  impp_a?: number;
  pmax_w?: number;
  vmpp_v?: number;
  efficiency_pct?: number;
  power_tolerance_neg_pct?: number;
  power_tolerance_pos_pct?: number;
  temperature_c?: number;
  temperature_tolerance_c?: number;
}

export interface PvModuleWarrantySpecs {
  primary_years?: number;
  product_years?: number;
  primary_output_pct?: number;
}

export interface PvModuleSeriesPowerRange {
  min?: number;
  max?: number;
}

export interface PvModuleSpecs {
  at_stc?: PvModuleElectricalSpecs;
  at_noct?: PvModuleElectricalSpecs;
  depth_mm?: number;
  warranty?: PvModuleWarrantySpecs;
  width_mm?: number;
  height_mm?: number;
  weight_kg?: number;
  cell_type?: string;
  frame_type?: string;
  glass_type?: string;
  cell_number?: number;
  technologies?: string[];
  connector_type?: string;
  cable_length_mm?: number;
  glass_thickness_mm?: number;
  junction_box_diodes?: number;
  junction_box_protection_class?: string;
  max_system_voltage_v?: number;
  operating_temp_max_c?: number;
  operating_temp_min_c?: number;
  series_fuse_rating_a?: number;
  series_power_range_wp?: PvModuleSeriesPowerRange;
  temp_coeff_isc_pct_c?: number;
  temp_coeff_voc_pct_c?: number;
  temp_coeff_pmax_pct_c?: number;
  cable_crosssection_mm2?: number;
}

export interface PvModule extends ComponentBase<"pv_module"> {
  specs: PvModuleSpecs;
}

export type PvModulesPage = ComponentsPage<PvModule>;
