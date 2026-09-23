from pydantic import BaseModel, Field


class RecommendationFactor(BaseModel):
    label: str
    detail: str


class RecommendationSkillLevels(BaseModel):
    skill_name: str = Field(alias="skillName")
    current_level: float = Field(alias="currentLevel")
    expected_level: float = Field(alias="expectedLevel")
    required_level: float = Field(alias="requiredLevel")

    model_config = {"populate_by_name": True}


class Recommendation(BaseModel):
    id: str
    employee_id: str = Field(alias="employeeId")
    activity_id: str = Field(alias="activityId")
    title: str
    description: str
    score: int
    factors: list[RecommendationFactor]
    skill_levels: RecommendationSkillLevels = Field(alias="skillLevels")
    format: str
    duration_hours: float = Field(alias="durationHours")
    start_date: str = Field(alias="startDate")

    model_config = {"populate_by_name": True}


class CompletionResult(BaseModel):
    success: bool
