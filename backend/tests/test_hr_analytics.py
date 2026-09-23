from collections import Counter

from app.core.config import settings
from app.services.data_loader import DataStore
from app.services.hr_analytics import hr_dashboard


def test_hr_status_breakdown_matches_all_history_records() -> None:
    store = DataStore.load(settings.data_dir)
    dashboard = hr_dashboard(store)
    expected = Counter(row["status"] for row in store.all_history())

    assert dashboard["statusBreakdown"] == {
        "completed": expected["completed"],
        "dropout": expected["dropped"],
        "dropped": expected["dropped"],
        "declined": expected["declined"],
        "noShow": expected["no_show"],
        "inProgress": expected["in_progress"],
        "planned": 0,
        "overdue": expected["overdue"],
    }


def test_activity_completion_rate_is_completed_over_all_participation_records() -> None:
    store = DataStore.load(settings.data_dir)
    dashboard = hr_dashboard(store)
    records_by_event: dict[str, list[dict[str, str]]] = {}
    for row in store.all_history():
        records_by_event.setdefault(row["event_id"], []).append(row)

    expected = []
    for event_id, records in records_by_event.items():
        completed = sum(row["status"] == "completed" for row in records)
        expected.append(
            {
                "activityName": store.events[event_id]["title"],
                "participants": len(records),
                "completionRate": round(100 * completed / len(records)),
            }
        )
    expected.sort(key=lambda item: (-item["participants"], item["activityName"]))

    assert dashboard["participationByActivity"] == expected[:8]
