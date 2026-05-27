import { PageHeader } from "@/components/page-header";
import { ChecklistTool, type ChecklistSection } from "@/components/tools/checklist-tool";
import { HotelAssessment } from "@/components/tools/hotel-assessment";

const SECTIONS: ChecklistSection[] = [
  {
    title: "Room selection",
    items: [
      "Request a room between the 2nd and 6th floors — high enough to deter ground-level intrusion, low enough for fire-ladder reach.",
      "Avoid ground-floor rooms with windows or doors opening to public areas.",
      "Avoid rooms directly beside stairwells, elevators, and service areas (high foot traffic, easy approach).",
      "Prefer a room away from the end of a corridor and not facing an exterior walkway.",
    ],
  },
  {
    title: "Door & access control",
    items: [
      "Engage the deadbolt and any secondary lock (swing bar / chain) whenever inside.",
      "Carry and use a portable door lock or a door wedge as a backup barrier.",
      "Confirm the peephole is clear and undamaged; use it before opening for anyone.",
      "Do not open the door to unannounced visitors — verify with the front desk by phone first.",
      "Hang the \"Do Not Disturb\" sign and leave a light or radio on when the room is empty.",
    ],
  },
  {
    title: "Windows & balcony",
    items: [
      "Check that all windows and balcony doors lock and latch fully.",
      "Treat ground-floor or otherwise accessible windows/balconies as entry points; keep them secured.",
      "Close curtains at night so the interior is not visible from outside.",
    ],
  },
  {
    title: "Room inspection",
    items: [
      "On arrival, do a calm walkthrough: note the layout, furniture, and anything that looks out of place.",
      "Visually inspect smoke detectors, outlets, and wall fixtures for objects or wires that do not belong.",
      "Look behind picture frames, mirrors, and the headboard for anything unexpected.",
      "Note any unusual or unexplained cables running to fixtures or decorations.",
      "If something seems off, request a room change rather than disturbing it.",
    ],
  },
  {
    title: "In-room valuables",
    items: [
      "Keep passport, primary cash, and key cards on your person rather than in the room.",
      "Limit what you leave behind to items you can afford to lose.",
      "Use the in-room safe only for low-value items; treat it as deterrence, not true security.",
      "Consider a decoy stash (small cash) separate from your real reserve.",
    ],
  },
  {
    title: "Emergency preparation",
    items: [
      "Locate at least two exits from your floor before you settle in.",
      "Count the number of doors between your room and the nearest exit (so you can navigate in smoke or darkness).",
      "Read the evacuation map on the back of the door and note the assembly point.",
      "Keep a phone, shoes, and a flashlight within reach of the bed.",
    ],
  },
];

export default function HotelSecurityPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Hotel & room security"
        description="Score a room against executive-protection room-selection tradecraft, see the gaps that hurt most, and generate a front-desk request. Runs entirely offline; your answers stay on this machine."
      />
      <HotelAssessment />
      <div>
        <h2 className="mb-1 text-base font-medium text-foreground">On-arrival walkthrough</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The score tells you which room to ask for. This checklist is the action
          layer once you&apos;re in the room.
        </p>
        <ChecklistTool
          toolKey="hotel"
          intro="Standard travel-security practice for staying low-profile and reducing risk in temporary lodging. These steps are observational and defensive — none require tampering with hotel property. Work through each section on arrival and re-check before leaving the room."
          sections={SECTIONS}
        />
      </div>
    </div>
  );
}
