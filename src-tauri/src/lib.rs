#[tauri::command]
fn app_minimize(window: tauri::Window) {
  let _ = window.minimize();
}

#[tauri::command]
fn app_toggle_maximize(window: tauri::Window) {
  if window.is_maximized().unwrap_or(false) {
    let _ = window.unmaximize();
  } else {
    let _ = window.maximize();
  }
}

#[tauri::command]
fn app_close(window: tauri::Window) {
  let _ = window.close();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![app_minimize, app_toggle_maximize, app_close])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
