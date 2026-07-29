An industrial control system (ICS/OT) for a municipal water treatment plant, to be threat-modelled against the MITRE ATT&CK for ICS framework rather than Enterprise ATT&CK:

- **Engineering Workstation**: a Windows workstation used by plant engineers to configure and update PLC logic. Occasionally connected to the corporate IT network for software updates - the single most sensitive pivot point between IT and OT.
- **HMI (Human-Machine Interface)**: the operator's control panel, displaying live tank levels, flow rates, and chemical dosing status, and allowing operators to issue setpoint changes.
- **SCADA Server**: the supervisory control server that polls PLCs for telemetry, logs historical data, and relays operator commands from the HMI down to the PLCs.
- **PLC (Programmable Logic Controller)**: the field controller that directly drives the chlorine dosing pump and reads level sensors on the treatment tank. Communicates with the SCADA Server over a Modbus/TCP field network.
- **Chlorine Dosing Pump (actuator)**: the physical actuator controlled by the PLC that regulates chemical dosing into the water supply - the ultimate physical-consequence asset in this system.
- **Level Sensor (field device)**: a physical sensor reporting tank water level to the PLC.
- **Historian**: a data historian that archives long-term SCADA telemetry for compliance reporting, occasionally queried by corporate IT reporting tools.
- **Corporate IT Network**: the plant's connection to the wider corporate business network (email, ERP, general internet access) - modeled as a separate, less-trusted zone per the Purdue Model.

Trust boundaries (following the Purdue Enterprise Reference Architecture model):
- **Corporate IT zone (Level 4-5)**: Corporate IT Network.
- **DMZ / Level 3.5**: none explicitly deployed in this plant - a known gap worth flagging as a design delta, since the Engineering Workstation currently bridges IT and OT with no intermediate DMZ.
- **Supervisory control zone (Level 2-3)**: Engineering Workstation, HMI, SCADA Server, Historian.
- **Field control zone (Level 0-1)**: PLC, Chlorine Dosing Pump, Level Sensor.

The critical risk in this system is any path from the Corporate IT Network through the Engineering Workstation down to the PLC and Chlorine Dosing Pump, since manipulating chemical dosing has a direct physical-world safety consequence, not merely a data-confidentiality one - this should be reflected in how "impact" is scored for attack paths reaching the PLC or the dosing pump.
