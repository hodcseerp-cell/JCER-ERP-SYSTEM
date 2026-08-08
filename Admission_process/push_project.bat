@echo off
echo ===================================================
echo Pushing Current Branch to GitHub Repository
echo Target URL: https://github.com/yuvarajbtalawar99-creator/Admission-process.git
echo ===================================================
echo.

:: Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Git is not installed or not in your PATH.
    pause
    exit /b 1
)

echo Step 1: Saving pending changes on current branch...
git add -A
git commit -m "Save local progress"

echo.
echo Step 2: Configuring remote repository...
:: Check if the remote 'upstream' already exists
git remote get-url upstream >nul 2>nul
if %errorlevel% neq 0 (
    echo Renaming current 'origin' to 'upstream'...
    git remote rename origin upstream
) else (
    echo Remote 'upstream' already exists. Removing current 'origin'...
    git remote remove origin >nul 2>nul
)

echo Adding new 'origin' pointing to Admission-process...
git remote add origin https://github.com/yuvarajbtalawar99-creator/Admission-process.git

echo.
echo Step 3: Pushing current branch to new origin...
git push -u origin HEAD

echo.
echo ===================================================
echo SUCCESS: Current branch pushed successfully!
echo ===================================================
echo.
pause
