from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

# ----------------------------------------------------------------------------
# Type Definitions
# ----------------------------------------------------------------------------
# UserRole: 3 primary user types + admin/college (managed roles)
UserRole = Literal["student", "alumni", "mentor", "college", "admin", "super_admin"]

# CareerPath: Drives all personalization on the platform
CareerPath = Literal["job", "higher_education", "startup", "business"]

# EducationLevel: Used for content segmentation per spec
EducationLevel = Literal["plus_one", "plus_two", "high_school", "diploma", "btech", "bachelors", "masters", "mba", "phd", "bootcamp", "other"]

# MentorCategory: 10-category taxonomy organized by function.
MentorCategory = Literal[
    "it_software", "engineering_manager",
    "tech_recruiter", "hr_mentor",
    "career_coach", "higher_education",
    "startup_mentor", "startup_advisor",
    "business_mentor", "industry_advisor",
    "interview_prep",       # Mock interviews, DSA, system design rounds
    "creative_design",      # UX/UI, branding, creative careers & portfolios
    "life_wellness",        # Work-life balance, mental health & mindfulness
    # Backward-compat aliases
    "startup", "business", "education", "startup_business",
]

# MentorStatus: Mentors are reviewed by admins before being visible to students
MentorStatus = Literal["pending", "approved", "rejected"]


# ----------------------------------------------------------------------------
# Shared Pydantic Models
# ----------------------------------------------------------------------------
class SchoolInfo(BaseModel):
    """Institution / education info common to all roles."""
    institution_name: str
    institution_type: Literal["school", "college", "university"] = "college"
    class_or_year: Optional[str] = None
    branch_or_stream: Optional[str] = None
    board_or_university: Optional[str] = None
    department: Optional[str] = None
    stream: Optional[str] = None
    branch: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    graduation_year: Optional[int] = None


class MentorInfo(BaseModel):
    """Mentor-specific fields per spec — requires admin approval."""
    category: MentorCategory
    organization: str
    job_title: str
    linkedin_url: Optional[str] = None
    years_of_experience: Optional[int] = None
    bio: Optional[str] = None
    session_price_inr: Optional[int] = None
    categories: Optional[List[MentorCategory]] = None
    education_level: Optional[str] = None
    expertise: Optional[List[str]] = None
    availability: Optional[List[str]] = None
    profile_photo: Optional[str] = None
    college: Optional[str] = None
    college_batch: Optional[int] = None


class CollegeInfo(BaseModel):
    """College / Institution-specific fields per College Onboarding spec."""
    institution_name: str
    institution_type: Optional[Literal["school", "college", "university", "institute"]] = "university"
    affiliated_university: Optional[str] = None
    official_website: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    accreditation: Optional[str] = None
    year_established: Optional[int] = None
    ranking_tier: Optional[str] = None
    accreditations: Optional[List[str]] = None
    contact_name: Optional[str] = None
    contact_designation: Optional[str] = None
    contact_official_email: Optional[str] = None
    contact_phone: Optional[str] = None
    features_needed: Optional[List[str]] = None
    logo: Optional[str] = None
    cover_photo: Optional[str] = None
    bio: Optional[str] = None
    writing_style: Optional[str] = None


class AlumniInfo(BaseModel):
    """Alumni-specific fields per Alumni Onboarding Wizard spec."""
    graduation_year: int
    university: str
    current_employer: Optional[str] = None
    current_role: Optional[str] = None
    employment_status: Literal["employed", "self_employed", "studying", "between_jobs"] = "employed"
    linkedin_url: Optional[str] = None
    wants_to_mentor: bool = False
    mentor_category: Optional[MentorCategory] = None
    mentor_categories: Optional[List[MentorCategory]] = None
    years_of_experience: Optional[int] = None
    domain_expertise: Optional[List[str]] = None
    tech_skills: Optional[List[str]] = None
    business_skills: Optional[List[str]] = None
    soft_skills: Optional[List[str]] = None
    next_chapter: Optional[str] = None
    profile_photo: Optional[str] = None
    bio: Optional[str] = None
    writing_style: Optional[str] = None


class StudentInfo(BaseModel):
    """Student-specific fields per spec."""
    age: Optional[int] = None
    education_level: Optional[EducationLevel] = None
    career_interests: List[str] = Field(default_factory=list)
    career_goal: Optional[str] = None
    cgpa: Optional[float] = None


class UserResponse(BaseModel):
    """Public user payload — never includes password_hash."""
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    unique_id: Optional[str] = None
    qr_code_base64: Optional[str] = None
    school_info: Optional[SchoolInfo] = None
    career_path: Optional[CareerPath] = None
    student_info: Optional[StudentInfo] = None
    alumni_info: Optional[AlumniInfo] = None
    mentor_info: Optional[MentorInfo] = None
    college_info: Optional[CollegeInfo] = None
    mentor_status: Optional[MentorStatus] = None
    interests: List[str] = []
    skills: List[str] = []
    bio: Optional[str] = None
    face_image_base64: Optional[str] = None
    onboarding_completed: bool = False
    two_fa_enabled: bool = False
    dob: Optional[str] = None
    country_code: Optional[str] = None
    postal_code: Optional[str] = None
    created_at: datetime
    # Phase-4 SA Profile Web fields
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    headline: Optional[str] = None
    photo_data: Optional[str] = None
    banner_data: Optional[str] = None
    college_logo_data: Optional[str] = None
    institution: Optional[str] = None
    branch: Optional[str] = None
    stream: Optional[str] = None
    department: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    primary_skill: Optional[str] = None
    profile_visibility: Optional[str] = None
    section_toggles: Optional[Dict[str, Any]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    preferences: Optional[Dict[str, Any]] = None
    is_verified: Optional[bool] = None
    ranking_tier: Optional[str] = None
    badges: List[Dict[str, Any]] = []
    # Identity & DigiLocker Verification
    aadhaar_number: Optional[str] = None
    aadhaar_masked: Optional[str] = None
    aadhaar_verified: Optional[bool] = False
    digilocker_id: Optional[str] = None
    digilocker_verified: Optional[bool] = False
    digilocker_doc_count: Optional[int] = 0
    digilocker_uri: Optional[str] = None
    digilocker_linked_at: Optional[str] = None

class AuthResponse(BaseModel):
    """Returned on successful login/registration/refresh."""
    access_token: str
    refresh_token: str
    user: UserResponse
