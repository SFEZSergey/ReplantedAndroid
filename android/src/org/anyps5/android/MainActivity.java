package org.anyps5.android;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.json.JSONObject;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.system.ErrnoException;
import android.system.Os;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.io.OutputStream;

public final class MainActivity extends Activity {
    private static final int PICK_GAME_DIRECTORY = 10;
    private static final int PICK_DRIVER_PACKAGE = 11;
    private Button driverButton, gameLanguageButton, uiLanguageButton;
    private TextView status;
    private Button start;

    static { System.loadLibrary("anyps5_android"); }
    private static native String nativeGetStatus();
    private static native String nativeProbeRuntime();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        // Хаб порта PvZ: Replanted: слева иконка, справа заголовок, статус, «Играть», папка дампа, настройки.
        final float dp = getResources().getDisplayMetrics().density;
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.HORIZONTAL); root.setGravity(Gravity.CENTER); root.setPadding((int)(24*dp), (int)(12*dp), (int)(24*dp), (int)(12*dp));
        root.setBackground(new android.graphics.drawable.GradientDrawable(android.graphics.drawable.GradientDrawable.Orientation.TL_BR, new int[] {0xff1e4620, 0xff0f2a14}));
        android.widget.ImageView icon = new android.widget.ImageView(this);
        icon.setImageDrawable(getApplicationInfo().loadIcon(getPackageManager()));
        LinearLayout.LayoutParams iconSize = new LinearLayout.LayoutParams((int)(112*dp), (int)(112*dp)); iconSize.rightMargin = (int)(24*dp);
        root.addView(icon, iconSize);
        LinearLayout panel = new LinearLayout(this); panel.setOrientation(LinearLayout.VERTICAL); panel.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = new TextView(this); title.setText("PvZ: Replanted"); title.setTextColor(0xfff1f8e9); title.setTextSize(28); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); panel.addView(title);
        TextView subtitle = new TextView(this); subtitle.setText(t("Порт с PS5 · AnyPS5 + box64 + Turnip", "PS5 port · AnyPS5 + box64 + Turnip")); subtitle.setTextColor(0xffa5d6a7); subtitle.setTextSize(12); panel.addView(subtitle);
        status = new TextView(this); status.setTextColor(0xffdcedc8); status.setTextSize(13); status.setPadding(0, (int)(8*dp), 0, (int)(8*dp)); panel.addView(status);
        LinearLayout actions = new LinearLayout(this); actions.setOrientation(LinearLayout.HORIZONTAL); actions.setGravity(Gravity.CENTER_VERTICAL);
        start = new Button(this); start.setText(t("Импорт и запуск", "Import and play")); styleButton(start, 0xff43a047, 18);
        start.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) { importAndStart(); } });
        LinearLayout.LayoutParams startSize = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT); startSize.rightMargin = (int)(12*dp);
        actions.addView(start, startSize);
        Button choose = new Button(this); choose.setText(t("Папка дампа", "Dump folder")); styleButton(choose, 0xff2e5e32, 14);
        choose.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) { chooseDirectory(); } }); actions.addView(choose);
        panel.addView(actions);
        LinearLayout options = new LinearLayout(this); options.setOrientation(LinearLayout.HORIZONTAL); options.setGravity(Gravity.CENTER_VERTICAL); options.setPadding(0, (int)(10*dp), 0, 0);
        final android.content.SharedPreferences touch = getSharedPreferences("touch_controls", MODE_PRIVATE);
        CheckBox touchBox = option(t("Сенсорное управление", "Touch controls"), touch.getBoolean("visible", !TouchControlsView.hasPhysicalGamepad()));
        touchBox.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() { @Override public void onCheckedChanged(CompoundButton b, boolean on) { touch.edit().putBoolean("visible", on).apply(); } });
        options.addView(touchBox);
        CheckBox turboBox = option(t("Турбо GPU", "GPU turbo"), launcherSetting("APS5_GPU_TURBO"));
        turboBox.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() { @Override public void onCheckedChanged(CompoundButton b, boolean on) { setLauncherSetting("APS5_GPU_TURBO", on); } });
        options.addView(turboBox);
        // Лимит кадров против нагрева: 60 (без лимита) → 45 → 30.
        final Button fps = new Button(this); styleButton(fps, 0xff2e5e32, 13);
        final String[] limits = {"60", "45", "30"};
        String saved = launcherValue("APS5_FPS_LIMIT"); if (saved == null) saved = "60";
        fps.setText("FPS: " + saved);
        fps.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) {
            String current = launcherValue("APS5_FPS_LIMIT"); if (current == null) current = "60";
            int next = 0; for (int i = 0; i < limits.length; i++) if (limits[i].equals(current)) next = (i + 1) % limits.length;
            setLauncherValue("APS5_FPS_LIMIT", limits[next].equals("60") ? null : limits[next]);
            fps.setText("FPS: " + limits[next]);
        }});
        options.addView(fps);
        panel.addView(options);
        // Драйвер GPU, язык игры, язык лаунчера.
        LinearLayout more = new LinearLayout(this); more.setOrientation(LinearLayout.HORIZONTAL); more.setGravity(Gravity.CENTER_VERTICAL); more.setPadding(0, (int)(8*dp), 0, 0);
        driverButton = new Button(this); styleButton(driverButton, 0xff2e5e32, 13);
        driverButton.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) { chooseDriver(); } });
        gameLanguageButton = new Button(this); styleButton(gameLanguageButton, 0xff2e5e32, 13);
        gameLanguageButton.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) { chooseGameLanguage(); } });
        uiLanguageButton = new Button(this); styleButton(uiLanguageButton, 0xff2e5e32, 13);
        uiLanguageButton.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) { chooseUiLanguage(); } });
        for (Button button : new Button[] {driverButton, gameLanguageButton, uiLanguageButton}) {
            LinearLayout.LayoutParams size = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT); size.rightMargin = (int)(8*dp);
            more.addView(button, size);
        }
        panel.addView(more);
        refreshSettingButtons();
        root.addView(panel);
        setContentView(root); showStatus();
    }


    // ---- Язык лаунчера: "system" (по языку телефона), "ru", "en". ----
    private String uiLanguage() { return getPreferences(MODE_PRIVATE).getString("ui_language", "system"); }
    private boolean russian() {
        final String chosen = uiLanguage();
        if (chosen.equals("ru")) return true;
        if (chosen.equals("en")) return false;
        return Locale.getDefault().getLanguage().equals("ru");
    }
    private String t(String ru, String en) { return russian() ? ru : en; }
    private String runtimeStatus() {
        final String probe = nativeProbeRuntime();
        return probe.startsWith("Box64 Android runtime") ? t("Box64 готов", "Box64 runtime ready") : probe;
    }
    private void chooseUiLanguage() {
        final String[] values = {"system", "en", "ru"};
        final String[] labels = {t("Как в системе", "System"), "English", "Русский"};
        int current = java.util.Arrays.asList(values).indexOf(uiLanguage());
        new AlertDialog.Builder(this).setTitle(t("Язык лаунчера", "Launcher language")).setSingleChoiceItems(labels, current, new DialogInterface.OnClickListener() {
            @Override public void onClick(DialogInterface dialog, int which) {
                getPreferences(MODE_PRIVATE).edit().putString("ui_language", values[which]).apply();
                dialog.dismiss();
                recreate();
            }
        }).show();
    }

    // ---- Язык игры: номер языка консоли PS5 (ANYPS5_LANGUAGE), "auto" — по языку телефона. ----
    private static final int[] GAME_LANGUAGE_CODES = {1, 18, 8, 30, 4, 2, 22, 3, 20, 5, 6, 7, 17, 16, 19, 23, 24, 25, 26, 12, 13, 14, 15, 0, 9, 11, 10, 21, 27, 28, 29};
    private static final String[] GAME_LANGUAGE_NAMES = {"English (US)", "English (UK)", "Русский", "Українська", "Deutsch", "Français", "Français (Canada)", "Español (España)", "Español (Latinoamérica)", "Italiano", "Nederlands", "Português (Portugal)", "Português (Brasil)", "Polski", "Türkçe", "Čeština", "Magyar", "Ελληνικά", "Română", "Suomi", "Svenska", "Dansk", "Norsk", "日本語", "한국어", "简体中文", "繁體中文", "العربية", "ไทย", "Tiếng Việt", "Bahasa Indonesia"};
    private String gameLanguageSetting() { return getPreferences(MODE_PRIVATE).getString("game_language", "auto"); }
    private static int consoleLanguageFor(Locale locale) {
        final String language = locale.getLanguage(), country = locale.getCountry();
        switch (language) {
            case "ru": return 8; case "uk": return 30; case "de": return 4; case "it": return 5; case "nl": return 6;
            case "pl": return 16; case "tr": return 19; case "cs": return 23; case "hu": return 24; case "el": return 25;
            case "ro": return 26; case "fi": return 12; case "sv": return 13; case "da": return 14; case "nb": case "no": case "nn": return 15;
            case "ja": return 0; case "ko": return 9; case "ar": return 21; case "th": return 27; case "vi": return 28; case "in": case "id": return 29;
            case "fr": return country.equals("CA") ? 22 : 2;
            case "es": return country.equals("ES") || country.isEmpty() ? 3 : 20;
            case "pt": return country.equals("BR") ? 17 : 7;
            case "zh": return country.equals("TW") || country.equals("HK") || country.equals("MO") ? 10 : 11;
            case "en": return country.equals("GB") || country.equals("IE") || country.equals("AU") || country.equals("NZ") ? 18 : 1;
            default: return 1;
        }
    }
    private int gameLanguageCode() {
        final String setting = gameLanguageSetting();
        if (setting.equals("auto")) return consoleLanguageFor(Locale.getDefault());
        try { return Integer.parseInt(setting); } catch (NumberFormatException e) { return 1; }
    }
    private String gameLanguageName(int code) {
        for (int i = 0; i < GAME_LANGUAGE_CODES.length; i++) if (GAME_LANGUAGE_CODES[i] == code) return GAME_LANGUAGE_NAMES[i];
        return "English (US)";
    }
    // Записывается перед каждым запуском: "как в системе" следует за языком телефона.
    private void applyGameLanguage() { setLauncherValue("ANYPS5_LANGUAGE", Integer.toString(gameLanguageCode())); }
    private void chooseGameLanguage() {
        final String[] labels = new String[GAME_LANGUAGE_NAMES.length + 1];
        labels[0] = t("Как в системе", "System") + " (" + gameLanguageName(consoleLanguageFor(Locale.getDefault())) + ")";
        System.arraycopy(GAME_LANGUAGE_NAMES, 0, labels, 1, GAME_LANGUAGE_NAMES.length);
        int current = 0;
        if (!gameLanguageSetting().equals("auto")) for (int i = 0; i < GAME_LANGUAGE_CODES.length; i++) if (Integer.toString(GAME_LANGUAGE_CODES[i]).equals(gameLanguageSetting())) current = i + 1;
        new AlertDialog.Builder(this).setTitle(t("Язык игры", "Game language")).setSingleChoiceItems(labels, current, new DialogInterface.OnClickListener() {
            @Override public void onClick(DialogInterface dialog, int which) {
                getPreferences(MODE_PRIVATE).edit().putString("game_language", which == 0 ? "auto" : Integer.toString(GAME_LANGUAGE_CODES[which - 1])).apply();
                applyGameLanguage();
                dialog.dismiss();
                refreshSettingButtons();
            }
        }).show();
    }

    // ---- Драйвер GPU: встроенный Turnip, системный, или пакет adrenotools (zip с meta.json). ----
    private File driversDir() { return new File(getFilesDir(), "drivers"); }
    private static final class DriverPackage {
        final File dir; final String name; final String library;
        DriverPackage(File dir, String name, String library) { this.dir = dir; this.name = name; this.library = library; }
    }
    private static DriverPackage readDriver(File dir) {
        String name = dir.getName(), library = null;
        try {
            final JSONObject meta = new JSONObject(new String(Files.readAllBytes(new File(dir, "meta.json").toPath()), "UTF-8"));
            name = meta.optString("name", name);
            final String version = meta.optString("driverVersion", "");
            if (!version.isEmpty() && !name.contains(version)) name += " " + version;
            library = meta.optString("libraryName", null);
        } catch (Exception ignored) {}
        if (library == null || !new File(dir, library).isFile()) {
            final File[] files = dir.listFiles();
            if (files != null) for (File file : files) if (file.getName().endsWith(".so") && file.getName().contains("vulkan")) library = file.getName();
        }
        return library != null && new File(dir, library).isFile() ? new DriverPackage(dir, name, library) : null;
    }
    private java.util.List<DriverPackage> installedDrivers() {
        final java.util.List<DriverPackage> drivers = new java.util.ArrayList<>();
        final File[] dirs = driversDir().listFiles();
        if (dirs != null) for (File dir : dirs) { if (!dir.isDirectory()) continue; final DriverPackage driver = readDriver(dir); if (driver != null) drivers.add(driver); }
        return drivers;
    }
    private String driverLabel() {
        final String driver = launcherValue("APS5_GPU_DRIVER");
        if (driver == null) return "Turnip";
        if (driver.equals("system")) return t("Системный", "System");
        final DriverPackage custom = readDriver(new File(driver));
        return custom != null ? custom.name : "Turnip";
    }
    private void chooseDriver() {
        final java.util.List<DriverPackage> drivers = installedDrivers();
        final java.util.List<String> labels = new java.util.ArrayList<>();
        labels.add(t("Turnip (встроенный)", "Turnip (built-in)"));
        labels.add(t("Системный драйвер телефона", "Phone's system driver"));
        for (DriverPackage driver : drivers) labels.add(driver.name);
        labels.add(t("+ Добавить драйвер (.zip)", "+ Add a driver (.zip)"));
        if (!drivers.isEmpty()) labels.add(t("Удалить драйвер…", "Remove a driver…"));
        final String active = launcherValue("APS5_GPU_DRIVER");
        int current = active == null ? 0 : active.equals("system") ? 1 : -1;
        for (int i = 0; i < drivers.size(); i++) if (drivers.get(i).dir.getAbsolutePath().equals(active)) current = i + 2;
        new AlertDialog.Builder(this).setTitle(t("Драйвер GPU", "GPU driver")).setSingleChoiceItems(labels.toArray(new String[0]), current, new DialogInterface.OnClickListener() {
            @Override public void onClick(DialogInterface dialog, int which) {
                dialog.dismiss();
                if (which == 0) { setLauncherValue("APS5_GPU_DRIVER", null); setLauncherValue("APS5_GPU_DRIVER_LIB", null); }
                else if (which == 1) { setLauncherValue("APS5_GPU_DRIVER", "system"); setLauncherValue("APS5_GPU_DRIVER_LIB", null); }
                else if (which < drivers.size() + 2) {
                    final DriverPackage driver = drivers.get(which - 2);
                    setLauncherValue("APS5_GPU_DRIVER", driver.dir.getAbsolutePath()); setLauncherValue("APS5_GPU_DRIVER_LIB", driver.library);
                } else if (which == drivers.size() + 2) {
                    final Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    pick.addCategory(Intent.CATEGORY_OPENABLE);
                    pick.setType("*/*");
                    pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {"application/zip", "application/x-zip-compressed", "application/octet-stream"});
                    startActivityForResult(pick, PICK_DRIVER_PACKAGE);
                    return;
                } else {
                    removeDriver(drivers);
                    return;
                }
                refreshSettingButtons();
            }
        }).show();
    }
    private void removeDriver(final java.util.List<DriverPackage> drivers) {
        final String[] labels = new String[drivers.size()];
        for (int i = 0; i < labels.length; i++) labels[i] = drivers.get(i).name;
        new AlertDialog.Builder(this).setTitle(t("Удалить драйвер", "Remove a driver")).setItems(labels, new DialogInterface.OnClickListener() {
            @Override public void onClick(DialogInterface dialog, int which) {
                final DriverPackage driver = drivers.get(which);
                if (driver.dir.getAbsolutePath().equals(launcherValue("APS5_GPU_DRIVER"))) { setLauncherValue("APS5_GPU_DRIVER", null); setLauncherValue("APS5_GPU_DRIVER_LIB", null); }
                clearDirectory(driver.dir);
                refreshSettingButtons();
            }
        }).show();
    }
    // Распаковка пакета в files/drivers/<имя>; пути внутри архива не выходят за каталог пакета.
    private void importDriver(final Uri uri) {
        status.setText(t("Устанавливаю драйвер…", "Installing the driver…"));
        new Thread(new Runnable() { @Override public void run() {
            String error = null;
            final File target = new File(driversDir(), "driver-" + System.currentTimeMillis());
            try {
                target.mkdirs();
                final String root = target.getCanonicalPath() + File.separator;
                try (InputStream in = getContentResolver().openInputStream(uri); ZipInputStream zip = new ZipInputStream(in)) {
                    ZipEntry entry;
                    final byte[] buffer = new byte[65536];
                    while ((entry = zip.getNextEntry()) != null) {
                        final File out = new File(target, entry.getName());
                        if (!out.getCanonicalPath().startsWith(root)) throw new Exception("bad path in archive: " + entry.getName());
                        if (entry.isDirectory()) { out.mkdirs(); continue; }
                        out.getParentFile().mkdirs();
                        try (OutputStream file = new FileOutputStream(out)) { int count; while ((count = zip.read(buffer)) > 0) file.write(buffer, 0, count); }
                    }
                }
                final DriverPackage driver = readDriver(target);
                if (driver == null) throw new Exception(t("в архиве нет библиотеки Vulkan (meta.json / libraryName)", "no Vulkan library in the archive (meta.json / libraryName)"));
                setLauncherValue("APS5_GPU_DRIVER", target.getAbsolutePath());
                setLauncherValue("APS5_GPU_DRIVER_LIB", driver.library);
            } catch (Exception e) {
                clearDirectory(target);
                error = e.getMessage();
            }
            final String failure = error;
            runOnUiThread(new Runnable() { @Override public void run() {
                if (failure != null) status.setText(t("Драйвер не установлен: ", "Driver not installed: ") + failure);
                else showStatus();
                refreshSettingButtons();
            }});
        }}).start();
    }

    private void refreshSettingButtons() {
        if (driverButton == null) return;
        driverButton.setText("GPU: " + driverLabel());
        gameLanguageButton.setText(t("Язык игры: ", "Game: ") + (gameLanguageSetting().equals("auto") ? t("системный", "system") + " (" + gameLanguageName(gameLanguageCode()) + ")" : gameLanguageName(gameLanguageCode())));
        uiLanguageButton.setText(uiLanguage().equals("system") ? t("Язык: системный", "Language: system") : uiLanguage().equals("ru") ? "Язык: Русский" : "Language: English");
    }

    private void styleButton(Button button, int color, int textSize) {
        final float dp = getResources().getDisplayMetrics().density;
        android.graphics.drawable.GradientDrawable shape = new android.graphics.drawable.GradientDrawable();
        shape.setColor(color); shape.setCornerRadius(12 * dp);
        button.setBackground(shape); button.setTextColor(0xffffffff); button.setTextSize(textSize); button.setAllCaps(false);
        button.setPadding((int)(20*dp), (int)(8*dp), (int)(20*dp), (int)(8*dp));
    }

    private CheckBox option(String label, boolean checked) {
        CheckBox box = new CheckBox(this); box.setText(label); box.setTextColor(0xffc5d5df); box.setTextSize(13); box.setChecked(checked);
        box.setPadding(0, 0, (int)(16 * getResources().getDisplayMetrics().density), 0);
        return box;
    }

    // Настройки хаба — <game>/launcher.env (NAME=1), libmain читает его до env.txt.
    private File launcherEnv() { return new File(new File(getFilesDir(), "game"), "launcher.env"); }
    private String launcherValue(String name) {
        try { for (String line : Files.readAllLines(launcherEnv().toPath())) if (line.startsWith(name + "=")) return line.substring(name.length() + 1); } catch (Exception ignored) {}
        return null;
    }
    private boolean launcherSetting(String name) { return "1".equals(launcherValue(name)); }
    private void setLauncherSetting(String name, boolean on) { setLauncherValue(name, on ? "1" : null); }
    private void setLauncherValue(String name, String value) {
        try {
            java.util.List<String> lines = new java.util.ArrayList<>();
            try { for (String line : Files.readAllLines(launcherEnv().toPath())) if (!line.startsWith(name + "=")) lines.add(line); } catch (Exception ignored) {}
            if (value != null) lines.add(name + "=" + value);
            launcherEnv().getParentFile().mkdirs();
            Files.write(launcherEnv().toPath(), lines);
        } catch (Exception e) { status.setText(t("Не удалось сохранить настройку: ", "Could not save the setting: ") + e.getMessage()); }
    }

    // После обновления APK рантайм в game/libs и game/x64lib устарел (нативная часть уже новая): он
    // раскладывается заново, если метка обновления пакета изменилась.
    private void refreshRuntimeIfUpdated(File game) throws Exception {
        long updated = getPackageManager().getPackageInfo(getPackageName(), 0).lastUpdateTime;
        File stamp = new File(game, ".runtime-stamp");
        String current = Long.toString(updated);
        try { if (current.equals(new String(Files.readAllBytes(stamp.toPath())).trim())) return; } catch (Exception ignored) {}
        copyPackagedRuntime("runtime/prx", new File(game, "libs"));
        copyPackagedRuntime("runtime/x64lib", new File(game, "x64lib"));
        Files.write(stamp.toPath(), current.getBytes());
    }

    private String selectedTree() { return getPreferences(MODE_PRIVATE).getString("game_tree", null); }
    private void showStatus() {
        String saved = selectedTree();
        File gameDir = new File(getFilesDir(), "game");
        if (new File(gameDir, "app.elf").isFile() && new File(gameDir, "libs").isDirectory()) {
            status.setText(t("Игра готова", "Game is ready") + "\n" + runtimeStatus());
            start.setText(t("Играть", "Play")); start.setEnabled(true); return;
        }
        boolean dumpReady = new File(gameDir, "eboot.bin").isFile();
        String source = dumpReady ? t("Дамп уже в папке игры; копировать заново не нужно", "The dump is already in the game folder; no copy needed") :
                (saved == null ? t("Выберите папку дампа (где лежит eboot.bin)", "Pick the dump folder (the one with eboot.bin)") : t("Папка: ", "Folder: ") + Uri.parse(saved).getLastPathSegment());
        status.setText(source + "\n" + runtimeStatus());
        start.setEnabled(dumpReady || saved != null);
    }
    private void chooseDirectory() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(i, PICK_GAME_DIRECTORY);
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_DRIVER_PACKAGE && result == RESULT_OK && data != null && data.getData() != null) {
            importDriver(data.getData());
            return;
        }
        if (request == PICK_GAME_DIRECTORY && result == RESULT_OK && data != null && data.getData() != null) {
            Uri uri = data.getData();
            int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            getContentResolver().takePersistableUriPermission(uri, flags);
            getPreferences(MODE_PRIVATE).edit().putString("game_tree", uri.toString()).apply(); showStatus();
        }
    }

    private void importAndStart() {
        final String value = selectedTree();
        final File game = new File(getFilesDir(), "game");
        if (new File(game, "app.elf").isFile() && new File(game, "libs").isDirectory()) {
            // Готовая раскладка (app.elf + libs): запуск без импорта, рантайм обновляется после обновления APK.
            start.setEnabled(false);
            status.setText(t("Проверяю рантайм…", "Checking the runtime…"));
            new Thread(new Runnable() { @Override public void run() {
                try {
                    refreshRuntimeIfUpdated(game);
                    runOnUiThread(new Runnable() { @Override public void run() {
                        start.setEnabled(true); showStatus();
                        applyGameLanguage();
                        startActivity(new Intent(MainActivity.this, GameActivity.class));
                    }});
                } catch (final Exception e) {
                    runOnUiThread(new Runnable() { @Override public void run() {
                        status.setText(t("Не удалось обновить рантайм:\n", "Could not update the runtime:\n") + e.getMessage()); start.setEnabled(true);
                    }});
                }
            }}).start();
            return;
        }
        final boolean dumpAlreadyPresent = new File(game, "eboot.bin").isFile();
        if (!dumpAlreadyPresent && value == null) return;
        start.setEnabled(false);
        status.setText(dumpAlreadyPresent ? t("Дамп найден в папке игры; использую имеющиеся файлы…", "Dump found in the game folder; using the existing files…") : t("Копирую папку игры… Это может занять несколько минут.", "Copying the game folder… This can take a few minutes."));
        new Thread(new Runnable() { @Override public void run() {
            try {
                if (!dumpAlreadyPresent) {
                    // Настройки хаба переживают очистку папки игры.
                    byte[] settings = null;
                    try { settings = Files.readAllBytes(launcherEnv().toPath()); } catch (Exception ignored) {}
                    clearDirectory(game); game.mkdirs();
                    if (settings != null) Files.write(launcherEnv().toPath(), settings);
                    // Accept the selected dump directly; if the saved SAF selection is
                    // its parent, import only the immediate child named "dump".
                    Uri tree = Uri.parse(value);
                    String rootId = DocumentsContract.getTreeDocumentId(tree);
                    String dumpId = findDumpDocument(tree, rootId);
                    copyTree(tree, dumpId == null ? rootId : dumpId, game);
                }
                File self = new File(game, "eboot.bin");
                if (!self.isFile()) throw new Exception("В выбранной папке не найден eboot.bin. Выбери сам каталог дампа.");
                File executable = new File(game, "app.elf");
                if (!executable.isFile()) {
                    statusOnUi(t("Извлекаю ELF из eboot.bin…", "Extracting the ELF from eboot.bin…"));
                    extractSelf(self, new File(game, "eboot.elf"));
                    extractSelfModules(game);
                    statusOnUi(t("Запускаю AnyPS5 relinker…", "Running the AnyPS5 relinker…"));
                    runRelinker(game);
                }
                if (!executable.isFile()) throw new Exception("Relinker завершился, но app.elf не создан");
                // Repair links even when an earlier import already created app.elf.
                linkGameResources(game);
                if (!executable.setExecutable(true, false)) throw new Exception("Не удалось разрешить запуск app.elf");
                copyPackagedRuntime("runtime/prx", new File(game, "libs"));
                linkGuestPrxLibraries(game);
                copyPackagedRuntime("runtime/x64lib", new File(game, "x64lib"));
                Files.write(new File(game, ".runtime-stamp").toPath(), Long.toString(getPackageManager().getPackageInfo(getPackageName(), 0).lastUpdateTime).getBytes());
                runOnUiThread(new Runnable() { @Override public void run() {
                    applyGameLanguage();
                        startActivity(new Intent(MainActivity.this, GameActivity.class));
                }});
            } catch (final Exception e) {
                runOnUiThread(new Runnable() { @Override public void run() {
                    status.setText(t("Импорт не удался:\n", "Import failed:\n") + e.getMessage()); start.setEnabled(true);
                }});
            }
        }}).start();
    }


    private static long u64(byte[] b, int p) { return ByteBuffer.wrap(b, p, 8).order(ByteOrder.LITTLE_ENDIAN).getLong(); }
    private static int u16(byte[] b, int p) { return ByteBuffer.wrap(b, p, 2).order(ByteOrder.LITTLE_ENDIAN).getShort() & 0xffff; }
    private static void putU16(byte[] b, int p, int v) { ByteBuffer.wrap(b, p, 2).order(ByteOrder.LITTLE_ENDIAN).putShort((short)v); }
    private static boolean isSelf(File f) throws Exception {
        if (!f.isFile() || f.length() < 4) return false;
        InputStream in = new java.io.FileInputStream(f);
        try { return in.read()==0x54 && in.read()==0x14 && in.read()==0xf5 && in.read()==0xee; } finally { in.close(); }
    }
    private static void extractSelf(File source, File destination) throws Exception {
        byte[] data = Files.readAllBytes(source.toPath());
        if (data.length < 0x40 || (u64(data, 0) & 0xffffffffL) != 0xEEF51454L) throw new Exception("eboot.bin не является PS5 SELF");
        int count=u16(data,0x18); long tableLong=0x20L+(long)count*0x20L;
        if (tableLong+64>data.length) throw new Exception("Повреждена таблица сегментов SELF");
        int table=(int)tableLong;
        if (data[table]!=0x7f || data[table+1]!='E' || data[table+2]!='L' || data[table+3]!='F') throw new Exception("SELF зашифрован: внутри не найден ELF-заголовок");
        long phoffLong=u64(data,table+32); int phentsize=u16(data,table+54), phnum=u16(data,table+56);
        if (phentsize<56 || phoffLong<0 || phoffLong+(long)phentsize*phnum>data.length-table) throw new Exception("Повреждены ELF program headers внутри SELF");
        int phoff=(int)phoffLong, headerSpan=phoff+phentsize*phnum; long maxSpan=headerSpan;
        long[] offsets=new long[phnum], sizes=new long[phnum];
        for(int i=0;i<phnum;i++){int h=table+phoff+i*phentsize;long off=u64(data,h+8),size=u64(data,h+32);if(off<0||size<0||off+size>Integer.MAX_VALUE)throw new Exception("SELF содержит неверные ELF offsets");offsets[i]=off;sizes[i]=size;maxSpan=Math.max(maxSpan,off+size);}
        if(maxSpan>Integer.MAX_VALUE)throw new Exception("Извлечённый ELF слишком велик");
        byte[] image=new byte[(int)maxSpan]; System.arraycopy(data,table,image,0,headerSpan); boolean placed=false;
        for(int i=0;i<count;i++){
            int entry=0x20+i*0x20;long flags=u64(data,entry),sourceOff=u64(data,entry+8),encoded=u64(data,entry+16),decoded=u64(data,entry+24);
            if((flags&2)!=0)throw new Exception("SELF содержит сжатый сегмент; такой дамп пока не поддержан");
            if(encoded!=decoded)throw new Exception("SELF содержит зашифрованный сегмент; нужен расшифрованный дамп");
            if((flags&0x800)==0)continue;int index=(int)((flags>>>20)&0xfff);if(index>=phnum||sizes[index]==0)continue;
            long amount=Math.min(sizes[index],decoded);if(sourceOff<0||sourceOff+amount>data.length||offsets[index]+amount>image.length)throw new Exception("Повреждены данные сегмента SELF");
            System.arraycopy(data,(int)sourceOff,image,(int)offsets[index],(int)amount);placed=true;
        }
        if(!placed)throw new Exception("SELF не содержит ELF-сегментов для извлечения");
        if(u16(image,16)==0xfe18)putU16(image,16,3);
        File parent=destination.getParentFile();if(parent!=null)parent.mkdirs();FileOutputStream out=new FileOutputStream(destination);try{out.write(image);}finally{out.close();}
    }
    private static void extractSelfModules(File game) throws Exception {
        for(String dirName:new String[]{"sce_module","sce_modules","prx"}){File dir=new File(game,dirName);File[] modules=dir.listFiles();if(modules==null)continue;for(File module:modules){if(!module.isFile()||!isSelf(module))continue;File temp=new File(module.getParentFile(),module.getName()+".elftmp");extractSelf(module,temp);if(!module.delete()||!temp.renameTo(module))throw new Exception("Не удалось заменить SELF-модуль: "+module.getName());}}
    }
    private void runRelinker(File game) throws Exception {
        File relinker=new File(getApplicationInfo().nativeLibraryDir,"librelinker.so");
        if(!relinker.isFile())throw new Exception("В APK не найден Android relinker");
        File elf=new File(game,"eboot.elf"), result=new File(game,"app.elf");
        ProcessBuilder pb=new ProcessBuilder(relinker.getAbsolutePath(),elf.getAbsolutePath(),result.getAbsolutePath());pb.directory(game);pb.redirectErrorStream(true);pb.redirectOutput(new File(game,"relinker.log"));pb.environment().put("LD_LIBRARY_PATH",getApplicationInfo().nativeLibraryDir);
        int code;try{code=pb.start().waitFor();}catch(Exception e){throw new Exception("Не удалось запустить relinker: "+e.getMessage());}
        if(code!=0||!result.isFile()){String detail="";try{java.util.List<String> lines=Files.readAllLines(new File(game,"relinker.log").toPath());int from=Math.max(0,lines.size()-12);detail=android.text.TextUtils.join("\n",lines.subList(from,lines.size()));}catch(Exception ignored){}throw new Exception("Relinker завершился с кодом "+code+(detail.isEmpty()?"":"\n"+detail));}
        if(!result.setExecutable(true,false))throw new Exception("Не удалось разрешить запуск созданного app.elf");
    }
    private void linkGameResources(File game) throws Exception {
        File app0=new File(game,"app0");if(!app0.exists()&&!app0.mkdirs())throw new Exception("Не удалось создать app0");
        File[] entries=game.listFiles();if(entries==null)return;
        for(File entry:entries){
            String name=entry.getName();
            if(name.equals("app0")||name.equals("app.elf")||name.equals("eboot.bin")||name.equals("eboot.elf")||name.equals("relinker.log")||name.equals("box64.log")||name.equals("libs")||name.equals("x64lib")||name.equals("sce_module")||name.equals("sce_modules")||name.equals("prx"))continue;
            File link=new File(app0,name);String target="../"+name;
            try{if(Files.exists(link.toPath(),java.nio.file.LinkOption.NOFOLLOW_LINKS))clearDirectory(link);Os.symlink(target,link.getAbsolutePath());}
            catch(Exception e){throw new Exception("Не удалось подключить ресурс "+name+" в app0: "+e.getMessage());}
        }
    }
    private void linkGuestPrxLibraries(File game) throws Exception {
        File libs=new File(game,"libs");libs.mkdirs();
        for(String folder:new String[]{"Modules","Plugins"}){
            File dir=new File(new File(game,"Media"),folder);File[] entries=dir.listFiles();if(entries==null)continue;
            for(File guest:entries){String filename=guest.getName();String suffix=".guest.prx";if(!guest.isFile()||!filename.endsWith(suffix))continue;
                String libraryName=filename.substring(0,filename.length()-suffix.length());File link=new File(libs,libraryName);
                String target="../Media/"+folder+"/"+filename;
                try{
                    if(Files.isSymbolicLink(link.toPath())){if(target.equals(Files.readSymbolicLink(link.toPath()).toString()))continue;Files.delete(link.toPath());}
                    else if(Files.exists(link.toPath(),java.nio.file.LinkOption.NOFOLLOW_LINKS))continue;
                    Os.symlink(target,link.getAbsolutePath());
                }catch(Exception e){throw new Exception("Не удалось подключить guest PRX "+filename+": "+e.getMessage());}
            }
        }
    }
    private void statusOnUi(final String message) { runOnUiThread(new Runnable(){@Override public void run(){status.setText(message);}}); }

    private String findDumpDocument(Uri tree, String rootId) {
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, rootId);
        Cursor cursor = getContentResolver().query(children, new String[] { DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_MIME_TYPE }, null, null, null);
        if (cursor == null) return null;
        try {
            boolean hasEboot = false; String dumpId = null;
            while (cursor.moveToNext()) {
                String name = cursor.getString(1), mime = cursor.getString(2);
                if ("eboot.bin".equalsIgnoreCase(name)) hasEboot = true;
                if ("dump".equalsIgnoreCase(name) && DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) dumpId = cursor.getString(0);
            }
            return hasEboot ? null : dumpId;
        } finally { cursor.close(); }
    }
    private void clearDirectory(File file) {
        // File.isDirectory follows symlinks; remove the link without traversing it.
        if (Files.isSymbolicLink(file.toPath())) { file.delete(); return; }
        if (file.isDirectory()) { File[] children = file.listFiles(); if (children != null) for (File child : children) clearDirectory(child); }
        if (file.exists()) file.delete();
    }
    private void copyTree(Uri tree, String documentId, File destination) throws Exception {
        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(tree, documentId);
        String[] columns = { DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_MIME_TYPE };
        Cursor cursor = getContentResolver().query(childrenUri, columns, null, null, null);
        if (cursor == null) throw new Exception("Android не открыл выбранную папку");
        try {
            while (cursor.moveToNext()) {
                String childId = cursor.getString(0); String name = cursor.getString(1); String mime = cursor.getString(2);
                File target = new File(destination, name);
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    target.mkdirs(); copyTree(tree, childId, target);
                } else {
                    Uri childUri = DocumentsContract.buildDocumentUriUsingTree(tree, childId);
                    InputStream in = getContentResolver().openInputStream(childUri);
                    if (in == null) throw new Exception("Не удалось прочитать файл: " + name);
                    OutputStream out = new FileOutputStream(target);
                    try { byte[] buffer = new byte[1024 * 1024]; int count; while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count); }
                    finally { in.close(); out.close(); }
                }
            }
        } finally { cursor.close(); }
    }
    private void copyPackagedRuntime(String assetPath, File destination) throws Exception {
        destination.mkdirs();
        for (String name : getAssets().list(assetPath)) {
            String path = assetPath + "/" + name; File target = new File(destination, name);
            String[] nested = getAssets().list(path);
            if (nested != null && nested.length > 0) copyPackagedRuntime(path, target);
            else {
                // Новый файл вместо записи поверх: ссылка не ведёт запись наружу, а работающий процесс
                // (старый mmap) не видит половину новой библиотеки.
                if (Files.exists(target.toPath(), java.nio.file.LinkOption.NOFOLLOW_LINKS)) Files.delete(target.toPath());
                InputStream in = getAssets().open(path); OutputStream out = new FileOutputStream(target);
                try { byte[] buffer = new byte[65536]; int count; while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count); }
                finally { in.close(); out.close(); }
            }
        }
    }
}
