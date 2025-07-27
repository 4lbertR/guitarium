This is an open source group lesson booking system ordered by guitarium.ee.
This app is used for managing lesson bookings with multiple groups (for example music schools or sports lessons, where most lessons are in a group).
This app supports unlimited students and groups.
The lessons are managed in google calendar.
The title of a lesson in google calendar is the group and description is reserved for tracking participants


<img width="519" height="374" alt="image" src="https://github.com/user-attachments/assets/3dfb3111-ad04-4757-82f2-e1f53865509f" />

The groups can have any name (e.g E1 or Tennis 1), but the group name has to be consistent.
A group can be created by creating an account that is a member of that group.
After that every lesson that has the title of the group shows up for that person.

At the moment a person can't be a member of 2 groups.

Ps. This can not be bypassed by creating another user with the same full name but different password/group. 

Pps. Only the first account registered under a name will work.


For setup, you will need:

1. A server to deploy the script to
2. Caprover or some similar one-click-app installer
3. A mySQL database (Can be installed from caprover)

On how to install caprover:
https://caprover.com/docs/get-started.html

After installing Caprover:
go to captain.something.mydomain.com

Log in with your credentials

Click on one-click-apps

![IMG_0095](https://github.com/user-attachments/assets/24d86f13-ad56-4191-9072-9347d08d58bc)
Search PhpMyAdmin
Set it up
Click on one-click-apps
Search MySql
Set it up

Create an empty app
![IMG_0096](https://github.com/user-attachments/assets/61c9448d-5a4d-422a-a588-035b7bbd939e)
Name it the name you want it to be


