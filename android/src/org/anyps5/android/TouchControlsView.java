package org.anyps5.android;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;

// Виртуальный геймпад поверх игры: стик, крестовина, ✕○□△, L1/R1/L2/R2, Options, сенсорная панель.
// Состояние уходит в libmain (GameActivity.nativeVirtualPad), libSceVideoOut подмешивает его к вводу.
// Касания мимо элементов проходят в игру. Кнопка-глаз сверху скрывает/показывает слой (запоминается);
// при подключённом физическом геймпаде слой при старте скрыт.
public final class TouchControlsView extends View {
    // Биты кнопок PS5 (libScePad PadButton).
    static final int L3 = 0x0002, OPTIONS = 0x0008, UP = 0x0010, RIGHT = 0x0020, DOWN = 0x0040, LEFT = 0x0080;
    static final int L2 = 0x0100, R2 = 0x0200, L1 = 0x0400, R1 = 0x0800;
    static final int TRIANGLE = 0x1000, CIRCLE = 0x2000, CROSS = 0x4000, SQUARE = 0x8000, TOUCHPAD = 0x100000;

    private static final int KIND_BUTTON = 0, KIND_STICK = 1, KIND_DPAD = 2, KIND_TOGGLE = 3;

    private static final class Control {
        final int kind;
        final int bit;
        final String label;
        final RectF bounds = new RectF();
        float cx, cy, radius;
        boolean round = true;
        Control(int kind, int bit, String label) { this.kind = kind; this.bit = bit; this.label = label; }
        boolean hit(float x, float y) {
            if (round) {
                final float dx = x - cx, dy = y - cy, r = radius * 1.25f;
                return dx * dx + dy * dy <= r * r;
            }
            return bounds.contains(x, y);
        }
    }

    private final Control[] controls;
    private final Control stick, dpad, toggle;
    // Какой элемент держит каждый палец (по индексу id указателя).
    private final Control[] held = new Control[16];
    private final float[] stickVector = new float[2];
    private int dpadBits = 0;
    private int buttons = 0;
    private int sentButtons = -1, sentLx = -1, sentLy = -1;
    private boolean visible;
    private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint text = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final SharedPreferences preferences;

    public TouchControlsView(Context context) {
        super(context);
        preferences = context.getSharedPreferences("touch_controls", Context.MODE_PRIVATE);
        visible = preferences.getBoolean("visible", !hasPhysicalGamepad());
        stick = new Control(KIND_STICK, 0, "");
        dpad = new Control(KIND_DPAD, 0, "");
        dpad.round = false;
        toggle = new Control(KIND_TOGGLE, 0, "◉");
        controls = new Control[] {
            stick, dpad, toggle,
            new Control(KIND_BUTTON, CROSS, "✕"), new Control(KIND_BUTTON, CIRCLE, "○"),
            new Control(KIND_BUTTON, SQUARE, "□"), new Control(KIND_BUTTON, TRIANGLE, "△"),
            new Control(KIND_BUTTON, L1, "L1"), new Control(KIND_BUTTON, R1, "R1"),
            new Control(KIND_BUTTON, L2, "L2"), new Control(KIND_BUTTON, R2, "R2"),
            new Control(KIND_BUTTON, OPTIONS, "≡"), new Control(KIND_BUTTON, TOUCHPAD, "▭"),
            new Control(KIND_BUTTON, L3, "L3"),
        };
        stroke.setStyle(Paint.Style.STROKE);
        text.setTextAlign(Paint.Align.CENTER);
        text.setTypeface(Typeface.DEFAULT_BOLD);
        setFocusable(false);
    }

    static boolean hasPhysicalGamepad() {
        for (int id : InputDevice.getDeviceIds()) {
            final InputDevice device = InputDevice.getDevice(id);
            if (device == null || device.isVirtual()) continue;
            final int sources = device.getSources();
            if ((sources & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD || (sources & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK) return true;
        }
        return false;
    }

    private Control find(int bit) {
        for (Control c : controls) if (c.kind == KIND_BUTTON && c.bit == bit) return c;
        return null;
    }

    private void place(Control c, float x, float y, float r) {
        c.cx = x; c.cy = y; c.radius = r;
        c.bounds.set(x - r, y - r, x + r, y + r);
    }

    @Override protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        final float u = Math.min(w, h) / 100f; // 1% короткой стороны
        place(stick, w * 0.13f, h * 0.70f, 15 * u);
        place(dpad, w * 0.28f, h * 0.80f, 11 * u);
        final float fx = w * 0.86f, fy = h * 0.66f, fr = 6.5f * u, fd = 12 * u;
        place(find(TRIANGLE), fx, fy - fd, fr);
        place(find(CROSS), fx, fy + fd, fr);
        place(find(SQUARE), fx - fd, fy, fr);
        place(find(CIRCLE), fx + fd, fy, fr);
        place(find(L1), w * 0.07f, h * 0.30f, 6 * u);
        place(find(L2), w * 0.07f, h * 0.13f, 6 * u);
        place(find(R1), w * 0.93f, h * 0.30f, 6 * u);
        place(find(R2), w * 0.93f, h * 0.13f, 6 * u);
        place(find(OPTIONS), w * 0.62f, h * 0.10f, 5 * u);
        place(find(TOUCHPAD), w * 0.38f, h * 0.10f, 5 * u);
        place(find(L3), w * 0.13f, h * 0.43f, 4.5f * u);
        place(toggle, w * 0.50f, h * 0.06f, 4 * u);
        text.setTextSize(5 * u);
        stroke.setStrokeWidth(Math.max(2f, 0.4f * u));
    }

    @Override protected void onDraw(Canvas canvas) {
        drawCircle(canvas, toggle, visible ? 0x55ffffff : 0x33ffffff, false);
        if (!visible) return;
        for (Control c : controls) {
            if (c == toggle) continue;
            if (c.kind == KIND_STICK) {
                drawCircle(canvas, c, 0x22ffffff, false);
                final float kx = c.cx + stickVector[0] * c.radius * 0.6f, ky = c.cy + stickVector[1] * c.radius * 0.6f;
                fill.setColor(isHeld(c) ? 0x77ffffff : 0x44ffffff);
                canvas.drawCircle(kx, ky, c.radius * 0.42f, fill);
            } else if (c.kind == KIND_DPAD) {
                drawDpad(canvas, c);
            } else {
                drawCircle(canvas, c, (buttons & c.bit) != 0 ? 0x88ffffff : 0x30ffffff, true);
            }
        }
    }

    private void drawCircle(Canvas canvas, Control c, int color, boolean label) {
        fill.setColor(color);
        canvas.drawCircle(c.cx, c.cy, c.radius, fill);
        stroke.setColor(0x66ffffff);
        canvas.drawCircle(c.cx, c.cy, c.radius, stroke);
        if (label || c == toggle) {
            text.setColor(0xccffffff);
            canvas.drawText(c.label, c.cx, c.cy - (text.descent() + text.ascent()) / 2, text);
        }
    }

    private void drawDpad(Canvas canvas, Control c) {
        final float r = c.radius, a = r / 3;
        final int[] bits = {UP, DOWN, LEFT, RIGHT};
        final float[][] centers = {{c.cx, c.cy - 2 * a}, {c.cx, c.cy + 2 * a}, {c.cx - 2 * a, c.cy}, {c.cx + 2 * a, c.cy}};
        for (int i = 0; i < 4; i++) {
            fill.setColor((dpadBits & bits[i]) != 0 ? 0x88ffffff : 0x30ffffff);
            canvas.drawRect(centers[i][0] - a, centers[i][1] - a, centers[i][0] + a, centers[i][1] + a, fill);
            stroke.setColor(0x66ffffff);
            canvas.drawRect(centers[i][0] - a, centers[i][1] - a, centers[i][0] + a, centers[i][1] + a, stroke);
        }
    }

    private boolean isHeld(Control c) {
        for (Control h : held) if (h == c) return true;
        return false;
    }

    private Control controlAt(float x, float y) {
        if (toggle.hit(x, y)) return toggle;
        if (!visible) return null;
        for (Control c : controls) if (c != toggle && c.hit(x, y)) return c;
        return null;
    }

    @Override public boolean onTouchEvent(MotionEvent event) {
        final int action = event.getActionMasked();
        final int index = event.getActionIndex();
        boolean consumed = false;
        switch (action) {
            case MotionEvent.ACTION_DOWN:
            case MotionEvent.ACTION_POINTER_DOWN: {
                final int id = event.getPointerId(index);
                if (id >= held.length) break;
                final Control c = controlAt(event.getX(index), event.getY(index));
                if (c == null) break;
                consumed = true;
                if (c == toggle) {
                    visible = !visible;
                    preferences.edit().putBoolean("visible", visible).apply();
                    if (!visible) releaseAll();
                    break;
                }
                held[id] = c;
                track(c, event.getX(index), event.getY(index));
                break;
            }
            case MotionEvent.ACTION_MOVE:
                for (int i = 0; i < event.getPointerCount(); i++) {
                    final int id = event.getPointerId(i);
                    if (id < held.length && held[id] != null) {
                        track(held[id], event.getX(i), event.getY(i));
                        consumed = true;
                    }
                }
                break;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_POINTER_UP: {
                final int id = event.getPointerId(index);
                if (id < held.length && held[id] != null) {
                    release(held[id]);
                    held[id] = null;
                    consumed = true;
                }
                break;
            }
            case MotionEvent.ACTION_CANCEL:
                releaseAll();
                consumed = true;
                break;
            default:
                break;
        }
        if (consumed) {
            recomputeButtons();
            send();
            invalidate();
        }
        return consumed;
    }

    private void track(Control c, float x, float y) {
        if (c.kind == KIND_STICK) {
            float dx = (x - c.cx) / (c.radius * 0.8f), dy = (y - c.cy) / (c.radius * 0.8f);
            final float len = (float) Math.sqrt(dx * dx + dy * dy);
            if (len > 1f) { dx /= len; dy /= len; }
            stickVector[0] = dx;
            stickVector[1] = dy;
        } else if (c.kind == KIND_DPAD) {
            final float dx = x - c.cx, dy = y - c.cy, dead = c.radius * 0.25f;
            int bits = 0;
            if (dy < -dead && Math.abs(dy) >= Math.abs(dx) * 0.5f) bits |= UP;
            if (dy > dead && Math.abs(dy) >= Math.abs(dx) * 0.5f) bits |= DOWN;
            if (dx < -dead && Math.abs(dx) >= Math.abs(dy) * 0.5f) bits |= LEFT;
            if (dx > dead && Math.abs(dx) >= Math.abs(dy) * 0.5f) bits |= RIGHT;
            dpadBits = bits;
        }
    }

    private void release(Control c) {
        if (c.kind == KIND_STICK) { stickVector[0] = 0; stickVector[1] = 0; }
        else if (c.kind == KIND_DPAD) dpadBits = 0;
    }

    private void releaseAll() {
        for (int i = 0; i < held.length; i++) held[i] = null;
        stickVector[0] = 0; stickVector[1] = 0;
        dpadBits = 0;
        recomputeButtons();
        send();
        invalidate();
    }

    private void recomputeButtons() {
        int bits = dpadBits;
        for (Control h : held) if (h != null && h.kind == KIND_BUTTON) bits |= h.bit;
        buttons = bits;
    }

    private void send() {
        final int lx = Math.max(0, Math.min(255, Math.round(128 + stickVector[0] * 127)));
        final int ly = Math.max(0, Math.min(255, Math.round(128 + stickVector[1] * 127)));
        if (buttons == sentButtons && lx == sentLx && ly == sentLy) return;
        sentButtons = buttons; sentLx = lx; sentLy = ly;
        try {
            GameActivity.nativeVirtualPad(buttons, lx, ly, 128, 128);
        } catch (UnsatisfiedLinkError ignored) {
        }
    }
}
