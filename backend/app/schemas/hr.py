from pydantic import BaseModel, Field


class SkillGapSummary(BaseModel):
    skill_name: str = Field(alias="skillName")
    category: str
    employees_affected: int = Field(alias="employeesAffected")

    model_config = {"populate_by_name": True}


class EmployeeWithoutRecommendation(BaseModel):
    employee_id: str = Field(alias="employeeId")
    full_name: str = Field(alias="fullName")
    department: str
    days_since_last_activity: int = Field(alias="daysSinceLastActivity")

    model_config = {"populate_by_name": True}


class StatusBreakdown(BaseModel):
    completed: int
    dropout: int
    declined: int
    no_show: int = Field(alias="noShow")
    in_progress: int = Field(alias="inProgress")
    planned: int
    overdue: int

    model_config = {"populate_by_name": True}


class ActivityParticipation(BaseModel):
    activity_name: str = Field(alias="activityName")
    participants: int
    completion_rate: int = Field(alias="completionRate")

    model_config = {"populate_by_name": True}


class HRDashboard(BaseModel):
    top_skill_gaps: list[SkillGapSummary] = Field(alias="topSkillGaps")
    employees_without_recommendation: list[EmployeeWithoutRecommendation] = Field(
        alias="employeesWithoutRecommendation"
    )
    status_breakdown: StatusBreakdown = Field(alias="statusBreakdown")
    participation_by_activity: list[ActivityParticipation] = Field(alias="participationByActivity")
    total_employees: int = Field(alias="totalEmployees")

    model_config = {"populate_by_name": True}
