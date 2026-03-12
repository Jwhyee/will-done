export interface DbGeminiModel {
  model_name: string;
  version: number;
  lineup: string;
  thinkable: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface GeminiResponse {
  result_text: string;
  final_model_name: string;
}
