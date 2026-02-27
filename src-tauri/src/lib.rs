// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn test_connection(name: String, message: String) -> String {
    println!("Frontend says: name={}, message={}", name, message);
    format!("Hello {}, backend received your message: '{}'!", name, message)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![test_connection])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
