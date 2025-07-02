<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This project is an Electron + Vite + React desktop app with SQLite, Tailwind CSS, React Router, and AppWrite backup integration. Use modern, clean code and utility-first styling. Follow the folder structure and IPC patterns for Electron security.

Key directives for this task:

    Modify existing files, do not rewrite them. You must apply changes by editing the current code, not by deleting files and creating them from scratch. This is to ensure all existing logic is preserved.

    The entire application is AI-generated. You are responsible for implementing all requirements completely. Do not leave any placeholders, comments, or tasks for a human to finish. The implementation must be fully autonomous and final."

    Work on a single problem and after fixing it check if its correct then more on to next problem 

    remember we had infinite rerenderning issues in the past, so be careful with state updates and ensure they are done correctly to avoid performance issues.

///// news  
we are finally moving to production ,so the current issues might be working in dev but we have found them not working in production, so please be careful and test everything in production mode before submitting the changes.

NOTE: The designs should be for laptop and make them wider instead of higher ...



issue #2
    for date selection filters , make it easier use a drop down list in both buying history and sale history (you miss understood me , the drop down should be for selecting the date like 1-31 for days , 1-12 for months and the year starting from 2025 and dynamically to the year the user uses the app )

issue #3
    cloud backup fails to fetch the backups to restore or download 
    console log :(
        
index-CXrVbjhP.js:19 CloudBackupManager: User authenticated: rekankoye3333@gmail.com
index-CXrVbjhP.js:19 CloudBackupManager: Failed to load backups: User not authenticated - please sign in to use cloud backup features
index-CXrVbjhP.js:19 CloudBackupManager: User authenticated: rekankoye3333@gmail.com
index-CXrVbjhP.js:19 CloudBackupManager: Failed to load storage usage: User not authenticated - please sign in to use cloud backup features
index-CXrVbjhP.js:19 CloudBackupManager: User authenticated: rekankoye3333@gmail.com
index-CXrVbjhP.js:19 CloudBackupManager: Failed to load backups: User not authenticated - please sign in to use cloud backup features
index-CXrVbjhP.js:19 CloudBackupManager: User authenticated: rekankoye3333@gmail.com
    )
    also see pasted image 

issue #4
    manual backups dont save the file in production , they dont even make the folder
