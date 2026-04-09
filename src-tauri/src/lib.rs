mod ai;
mod commands;
mod commands_ai;
mod commands_files;
mod config;
mod db;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;
use std::fs;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("taskhelper.db");

            let pool = tauri::async_runtime::block_on(db::init_db(&db_path))
                .map_err(|e| -> Box<dyn std::error::Error> { Box::new(e) })?;
            app.manage(db::AppState { pool });

            let show = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "隐藏到托盘", true, None::<&str>)?;
            let autostart_on = MenuItem::with_id(app, "autostart_on", "开启开机自启", true, None::<&str>)?;
            let autostart_off = MenuItem::with_id(app, "autostart_off", "关闭开机自启", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show, &hide, &autostart_on, &autostart_off, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("任务助手")
                .on_menu_event(|app, event| {
                    let window = app.get_webview_window("main").unwrap();
                    match event.id.as_ref() {
                        "show" => {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                        "hide" => {
                            let _ = window.hide();
                        }
                        "autostart_on" => {
                            use tauri_plugin_autostart::ManagerExt;
                            let _ = app.autolaunch().enable();
                        }
                        "autostart_off" => {
                            use tauri_plugin_autostart::ManagerExt;
                            let _ = app.autolaunch().disable();
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks,
            commands::add_task,
            commands::complete_task,
            commands::delete_task,
            commands::add_subtasks,
            commands::get_subtasks,
            commands::complete_subtask,
            commands::add_task_log,
            commands::get_task_logs,
            commands::delete_task_log,
            commands::get_task_by_id,
            commands_ai::set_api_key,
            commands_ai::get_api_key_status,
            commands_ai::parse_nl_task,
            commands_ai::ai_breakdown_task,
            commands_ai::check_weekly_report,
            commands_ai::generate_full_report,
            commands_files::save_attachment,
            commands_files::get_attachments,
            commands_files::delete_attachment,
            commands_files::open_file,
            commands_files::read_image_base64,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
