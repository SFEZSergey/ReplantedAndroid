package org.anyps5.android;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import org.libsdl.app.SDLActivity;

public final class GameActivity extends SDLActivity {
    // Состояние виртуального геймпада (TouchControlsView) для libSceVideoOut; реализовано в libmain.
    static native void nativeVirtualPad(int buttons, int leftX, int leftY, int rightX, int rightY);

    @Override protected String[] getLibraries() {
        return new String[] { "c++_shared", "SDL2", "main" };
    }
    @Override protected String[] getArguments() {
        java.io.File game = new java.io.File(getFilesDir(), "game");
        java.io.File executable = new java.io.File(game, "app.elf");
        return new String[] { executable.getAbsolutePath(), getApplicationInfo().nativeLibraryDir, getFilesDir().getAbsolutePath() };
    }

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        // Рисуем и под вырезом камеры: игра занимает весь экран.
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams attributes = getWindow().getAttributes();
            attributes.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(attributes);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
        // Сенсорное управление поверх поверхности SDL (касания мимо элементов уходят в игру).
        if (mLayout != null) {
            mLayout.setMotionEventSplittingEnabled(true);
            mLayout.addView(new TouchControlsView(this), new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        }
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    // Полноэкранный immersive-режим: строка состояния и навигационная полоса скрыты, появляются
    // временно по свайпу от края.
    private void hideSystemBars() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
}
