use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiRequest {
    pub contents: Vec<GeminiContent>,
    #[serde(rename = "systemInstruction", skip_serializing_if = "Option::is_none")]
    pub system_instruction: Option<GeminiSystemInstruction>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiSystemInstruction {
    pub parts: Vec<GeminiPart>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiContent {
    pub parts: Vec<GeminiPart>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiPart {
    pub text: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiResponse {
    pub candidates: Vec<GeminiCandidate>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiCandidate {
    pub content: GeminiContent,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiModelsResponse {
    pub models: Vec<GeminiModel>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GeminiModel {
    pub name: String,
    pub supported_generation_methods: Vec<String>,
    #[serde(default)]
    pub thinking: bool,
}
