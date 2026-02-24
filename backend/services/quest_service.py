import uuid
from models.quest import Quest, QuestCreate, QuestStatus

class QuestService:
    def __init__(self) -> None:
        self.quests: dict[str, Quest] = {}

    def create(self, data: QuestCreate) -> Quest:
        quest_id = str(uuid.uuid4())[:8]
        quest = Quest(id=quest_id, title=data.title, description=data.description, exp_reward=data.exp_reward, source_file=data.source_file)
        self.quests[quest_id] = quest
        return quest

    def list_active(self) -> list[Quest]:
        return [q for q in self.quests.values() if q.status == QuestStatus.active]

    def list_all(self) -> list[Quest]:
        return list(self.quests.values())

    def complete(self, quest_id: str) -> Quest | None:
        quest = self.quests.get(quest_id)
        if quest and quest.status == QuestStatus.active:
            quest.status = QuestStatus.completed
            return quest
        return None

    def get(self, quest_id: str) -> Quest | None:
        return self.quests.get(quest_id)
