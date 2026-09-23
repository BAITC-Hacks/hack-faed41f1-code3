from pydantic import BaseModel, Field


class Skill(BaseModel):
    id: str
    name: str
    category: str
    current_level: float = Field(alias="currentLevel")
    required_level: float = Field(alias="requiredLevel")
    critical: bool

    model_config = {"populate_by_name": True}


class GradeInfo(BaseModel):
    current: str
    target: str
    target_deadline: str = Field(alias="targetDeadline")
    goal: str

    model_config = {"populate_by_name": True}


class Employee(BaseModel):
    id: str
    full_name: str = Field(alias="fullName")
    role: str
    department: str
    avatar_initials: str = Field(alias="avatarInitials")
    grade: GradeInfo
    skills: list[Skill]

    model_config = {"populate_by_name": True}


class ActivityHistoryEntry(BaseModel):
    id: str
    employee_id: str = Field(alias="employeeId")
    activity_id: str = Field(alias="activityId")
    activity_name: str = Field(alias="activityName")
    date: str
    status: str
    format: str
    duration_hours: float = Field(alias="durationHours")

    model_config = {"populate_by_name": True}


class TrajectorySkill(BaseModel):
    skill_id: str = Field(alias="skillId")
    skill_name: str = Field(alias="skillName")
    current_level: float = Field(alias="currentLevel")
    required_level: float = Field(alias="requiredLevel")
    gap: float
    critical: bool

    model_config = {"populate_by_name": True}


class Trajectory(BaseModel):
    employee_id: str = Field(alias="employeeId")
    current_role: str = Field(alias="currentRole")
    current_grade: str = Field(alias="currentGrade")
    target_role: str = Field(alias="targetRole")
    target_grade: str = Field(alias="targetGrade")
    as_of_date: str = Field(alias="asOfDate")
    progress_percentage: int = Field(alias="progressPercentage")
    skills: list[TrajectorySkill]

    model_config = {"populate_by_name": True}
