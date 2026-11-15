# Weighbridge COM Port – Troubleshooting & Setup Guide (End to End)

This guide takes you from "COM port not found" to live weight showing on the
**Weighment** screen.

---

## 0. Understand how the connection works (read this first)

```
Weighbridge indicator ──RS232 cable──► Cabin PC (COM port)
                                         │
                                         │  start_agent.bat  →  weighbridge_agent.js
                                         ▼
                              Internet (Socket.IO)
                                         ▼
                      WSMS cloud server (https://wsms-1.onrender.com)
                                         ▼
                      Browser → Weighment screen (live weight)
```

* The WSMS server runs **in the cloud (Render)**. A cloud server **has no COM
  ports**, and it never will. The weighbridge cable plugs into the **cabin PC**, so
  the COM port is only on that PC.
* The **local agent** (`start_agent.bat` + `weighbridge_agent.js`) runs on the
  cabin PC. It reads the COM port and sends the weight to the cloud.
* **If the agent is not running, the app always shows "No COM ports detected",
  even when the cable and driver are fine.** This is the most common cause.

---

## 1. Quick checklist (fix most cases in 5 minutes)

| # | Check | Where |
|---|-------|-------|
| 1 | Indicator is powered on and shows a weight | Cabin |
| 2 | RS232 / USB-serial cable is plugged in at **both ends** | Indicator and PC |
| 3 | The port shows in **Device Manager → Ports (COM & LPT)** with no yellow ⚠ | Cabin PC |
| 4 | **Node.js LTS** is installed (`node -v` in Command Prompt) | Cabin PC |
| 5 | `start_agent.bat` and `weighbridge_agent.js` are in the **same folder** | Cabin PC |
| 6 | **No other software** has the COM port open (old weighbridge software, HyperTerminal, PuTTY, a second agent window) | Cabin PC |
| 7 | `start_agent.bat` is running and shows `🟢 [CLOUD] Connected` and `⚖️ Live Machine Weight` | Cabin PC |
| 8 | Diagnostics page shows **"Agent on <PC name>: … reading COMx"** | Web app |

---

## 2. Step 1: Make Windows see the COM port

1. Press **Win + X → Device Manager**.
2. Expand **Ports (COM & LPT)**.
   * You should see something like `USB-SERIAL CH340 (COM3)`, `Prolific USB-to-Serial (COM4)`,
     `USB Serial Port (COM5)` (FTDI), or `Communications Port (COM1)` (built-in port on the motherboard).
3. **No "Ports (COM & LPT)" section, or the device shows under "Other devices" with a yellow ⚠:**
   the USB-serial driver is missing. Install the driver that matches the cable's chip:

   | Chip printed on cable / Device Manager | Driver |
   |---|---|
   | CH340 / CH341 (most cheap cables) | https://www.wch-ic.com/downloads/CH341SER_EXE.html |
   | FTDI (FT232) | https://ftdichip.com/drivers/vcp-drivers/ |
   | Prolific PL2303 | https://www.prolific.com.tw/US/ShowProduct.aspx?p_id=225&pcid=41 |
   | Silicon Labs CP210x | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |

   To find the chip: right-click the unknown device → **Properties → Details → Hardware Ids**.
   `VID_1A86` = CH340, `VID_0403` = FTDI, `VID_067B` = Prolific, `VID_10C4` = Silicon Labs.
4. **Port shows as "USB Serial Device (COMx)":** Windows is using its generic USB serial driver.
   Open **Properties → Details → Hardware Ids**:
   * `VID_1A86&PID_55D4` (CH9102) or `VID_1A86&PID_55D3` (CH343): install the **CH343SER** driver from
     https://www.wch-ic.com/downloads/CH343SER_EXE.html (the CH341SER driver does **not** cover these chips).
   * Any other VID: the indicator probably has its own USB port. The generic driver is fine. The agent turns on
     DTR/RTS (`"setDtrRts": true`), which these devices usually need before they send anything.
5. **Prolific "This device cannot start (Code 10)":** fake or old PL2303 chips
   do not work with the newest driver. Install the older Prolific driver (v3.3.2.102), or replace the
   cable with a CH340 or FTDI one.
6. **Still nothing appears:** try another USB port (avoid USB hubs), another cable, and
   unplug and re-plug. The COM number can **change** when you move the cable to a different USB port.
7. Write down the COM number (e.g. `COM3`).

---

## 3. Step 2: Install and start the agent on the cabin PC

1. Install **Node.js LTS** from https://nodejs.org (click Next through the installer). Restart the PC if
   `node -v` is not recognised afterwards.
2. In the web app, open **Diagnostics** and click **📥 Download start_agent.bat** and
   **📥 Download weighbridge_agent.js**.
   (Or copy `backend/scripts/start_agent.bat` and `backend/scripts/weighbridge_agent.js` from the repository.)
3. Make a folder, e.g. `C:\WSMS-Agent\`, and put **both files** in it.
   Do not run them from inside a ZIP file or from the Downloads preview.
4. Double-click **`start_agent.bat`**.
   * The first run installs `serialport` and `socket.io-client` (needs internet, takes about 1 minute).
   * If Windows SmartScreen appears: **More info → Run anyway**.
5. **Healthy output looks like this:**
   ```
   🔍 [HARDWARE] Available COM ports:
      - COM3  wch.cn  [USB adapter: CH340/CH341 (WCH)]
   🔌 [HARDWARE] Opening COM3 at 9600 baud...
   ✅ [HARDWARE] Opened COM3. Waiting for weight data...
   🟢 [CLOUD] Connected to WSMS Cloud Server
   ⚖️  Live Machine Weight: 12340 KG  [Stable] [Streaming to Cloud]
   ```
6. **Keep this window open** (minimise it) while you are weighing. Closing it stops the live weight.

### Find the right port and baud rate automatically (scan mode)

Open Command Prompt in the agent folder and run:

```bash
start_agent.bat scan
```

The scan tries every COM port at 9600, 2400, 4800, 1200 and 19200 baud for 3 seconds each,
then prints which one sends readable weight, for example
`✅ Weighbridge found on COM3 at 2400 baud`. It saves the result to `agent_config.json`, and
normal runs use it first. Put a load (or a person) on the platform during the scan if you can.

In the default `"comPort": "AUTO"` mode, a normal run also does this by itself: if a port or baud rate stays silent for
10 seconds, the agent moves on to the next one.

---

## 4. Step 3: Configure `agent_config.json` (only if AUTO does not find it)

The file sits next to the agent. The agent creates it on the first run.

```json
{
  "cloudServerUrl": "https://wsms-1.onrender.com",
  "comPort": "AUTO",
  "baudRate": 9600,
  "dataBits": 8,
  "parity": "none",
  "stopBits": 1,
  "scanBaudRates": [9600, 2400, 4800, 1200, 19200],
  "noDataTimeoutMs": 10000,
  "reverseDigits": false,
  "reconnectIntervalMs": 3000,
  "lastDetected": null
}
```

| Setting | When to change it |
|---|---|
| `comPort` | Set it to the exact port from Device Manager, e.g. `"COM3"`, to stop auto-detection. |
| `baudRate` | Must match the indicator's setting (often 9600 or 2400). Wrong baud = garbage characters or no weight. |
| `parity` / `dataBits` / `stopBits` | Most indicators use 8-N-1. Some use 7-E-1: set `"dataBits": 7, "parity": "even"`. |
| `reverseDigits` | Set `true` if the weight shows backwards (e.g. the indicator sends `=0021000` for 1200 kg). |
| `setDtrRts` | Leave `true`. Set it to `false` only if the indicator misbehaves when DTR/RTS are raised. |
| `pollCommand` | For indicators in **demand/print** mode that only send when asked. Put the request command from the manual here, e.g. `"P"` or `"R\\r\\n"`. The agent sends it every `pollIntervalMs`. |
| `cloudServerUrl` | Your backend URL **without** `/api`. |

Save the file, close the agent window, and start `start_agent.bat` again.

---

## 4b. Indicator with its own "USB COM" port (USB printer-type cable)

Many indicators have a square **USB-B socket marked "USB COM"**. You connect it to the PC with a normal
USB-A to USB-B (printer) cable. Windows then shows **"USB Serial Device (COMx)"** with the built-in Microsoft
driver. **No CH340/FTDI driver is needed**: the CH341SER installer only says "Pre-installed in advance" and changes nothing.

If the agent shows **0 bytes** on this port, the indicator is not sending on USB:
1. Run `start_agent.bat scan`. When a port is silent, the scan also tries common "send weight" request
   commands (`P`, `R`, `W`, `S`, ENQ, …). If the indicator answers one, it is saved as `pollCommand` automatically.
2. If no command works, open the indicator's setup menu and set the **serial/COM output mode = Continuous**,
   and **output port = USB** (some indicators send only on the 9-pin port unless USB is selected).
3. The **9-pin port marked "TABLE TOP" / "REMOTE" / "SCOREBOARD"** usually streams weight continuously all the time.
   With a USB-to-RS232 adapter you can read weight from that port instead.

## 5. Step 4: Indicator settings (the port opens but no weight arrives)

The agent shows `✅ Opened COM3` but then
`No readable weight from COM3 @ 9600 baud in 10s`:

1. **Turn on the indicator's serial output.** In the indicator setup menu (often a long press on
   **SET / FUNC / PRINT**, or a technician code), find the RS232 / serial output setting and choose
   **Continuous** (or "Stream" / "Cont"). In **Print/Demand** mode the indicator only sends data when you press PRINT.
2. **Match the baud rate.** Read it from the indicator menu (`bAud`, `br`) and set the same value in
   `agent_config.json`, or run `start_agent.bat scan`.
3. **Check the cable wiring (DB9).** Most indicators need a 3-wire cable: pin 2 → 3, pin 3 → 2, pin 5 → 5
   (a **null-modem / crossed** cable). If you see no data with a straight cable, swap pins 2 and 3 or use a
   null-modem adapter. Some indicators send on pin 2 with a straight cable. Try both.
4. **Test the cable on its own:** close the agent, open PuTTY → Serial → COM3 → 9600 → Open.
   If you see numbers scrolling, the hardware is fine and only the agent settings need fixing.
   If you see nothing, the problem is the indicator, cable or wiring. **Close PuTTY before you start the agent again.**

---

## 6. Step 5: Check it in the web app

1. Open **Diagnostics → Run Diagnostic**.
   * **COM Port Detection** should say `Agent on <CABIN-PC>: 1 COM port(s), reading COM3 @ 9600`.
   * **Hardware Data Stream** shows the raw readings, e.g. `+012340`.
   * **WebSocket Relay** shows the parsed weights.
2. Open **Weighment**. The live weight should follow the indicator display.
3. Make sure **Mock Mode** is **off** in Settings, and that the **Manual Weight** toggle is off.

---

## 7. Error messages and fixes

| Message (agent window or Diagnostics) | Cause | Fix |
|---|---|---|
| `No weighbridge agent connected… Run start_agent.bat on the weighbridge cabin PC` | The agent is not running or cannot reach the cloud | Start `start_agent.bat` on the cabin PC; check its internet connection. |
| `Node.js is not installed on this PC` | Node is missing | Install Node.js LTS (step 3.1). |
| `No COM ports found on this PC` | Cable unplugged or driver missing | Step 2 (Device Manager + driver). |
| `COMx is in use by another program` (Access denied) | Another program has the port open | Close the old weighbridge software, PuTTY or HyperTerminal, or the second agent window. Or restart the PC. |
| `COMx does not exist on this PC` (File not found) | Wrong COM number in the config | Check Device Manager; fix `comPort` or set it to `"AUTO"`. |
| `0 bytes received from COMx` | Nothing is arriving: the indicator output is off or in demand mode, wrong cable or pins, or DTR/RTS is needed | Set the indicator to Continuous output, or set `pollCommand`; check the wiring (step 5). |
| `N bytes received … but no readable weight` (shows hex bytes) | Wrong baud rate or parity | Run `start_agent.bat scan`; try 7-E-1. Send the hex bytes to support. |
| Weight shows strange characters or wrong numbers | Wrong baud or parity | Run `start_agent.bat scan`; try 7-E-1. |
| Weight is backwards (1200 shows as 21) | The indicator sends digits in reverse | Set `"reverseDigits": true`. |
| `[CLOUD] Cannot reach https://…` | No internet, wrong URL, or the server is waking up | Check internet and `cloudServerUrl`. The Render free tier takes about 50 s to wake: wait and it reconnects by itself. |
| `Agent … is online but sees no COM ports` | The agent runs but Windows sees no port | Step 2. |
| Weight works, then stops after unplugging | The COM number changed after re-plugging | AUTO mode re-detects it. With a fixed `comPort`, update the number. |

---

## 8. Run the agent automatically when the PC starts (optional)

1. Press **Win + R**, type `shell:startup`, and press Enter.
2. Right-click → **New → Shortcut** → browse to `C:\WSMS-Agent\start_agent.bat` → Finish.
3. Optional: in the shortcut's Properties, set **Run: Minimized**.

The agent now starts after every reboot. It reconnects by itself to the COM port and to the cloud.

---

## 9. Still not working? Send this to support

1. A screenshot of the **agent window** (from start to the error).
2. A screenshot of **Device Manager → Ports (COM & LPT)**.
3. The output of `start_agent.bat scan`.
4. A screenshot of **Diagnostics → Run Diagnostic**.
5. The indicator make and model, and its serial settings (baud, output mode).
