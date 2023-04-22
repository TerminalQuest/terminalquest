# Command and Conquer

Many people interact with a computer through a [graphical user interface](https://techterms.com/definition/gui), or **GUI** for short. Using a GUI, you can tell the computer what to do by clicking buttons, dragging windows with your mouse, and generally by interacting with objects you see on the screen. 

To create your own software, you will need to **give a computer lower-level instructions** than you usually do. Often, you will give your computer those lower-level instructions using a [command line interface](https://techterms.com/definition/command_line_interface), or **CLI** for short. A CLI is different from a GUI because instead of telling the computer what to do by clicking buttons, you type in **commands** which tell the computer what to do. A command then will often output text that conveys the result or information requested by your command.

To clear this barrier, you'll need to launch a special application on your computer that provides a **comand line interface**. You'll then need to execute a command, and see what it gives you in response. It will look something like this.

![terminal app PWD output](images/dev_skills/pwd.png)

On Mac OS and Linux-based computers, the application you need is called [Terminal](https://support.apple.com/guide/terminal/welcome/mac). On Windows, this application is called [PowerShell](https://docs.microsoft.com/en-us/powershell/scripting/install/installing-windows-powershell?view=powershell-7). There are other CLI applications that you can use on these computers, but the two mentioned here should be installed by default.

## Executing a Command

Your computer knows how to do a great many things, and comes with many [built-in commands](https://www.educative.io/blog/bash-shell-command-cheat-sheet). A command is a sequence of characters (sometimes a word, sometimes an abbreviation), that asks a computer to do a specific task, or give you some kind of information.

The command you need for this exercise is:

```bash
pwd
```

`pwd` stands for `present working directory` (you don't need to worry about it yet, but you can [learn more here](https://shapeshed.com/unix-pwd/)). Without going into a lot of detail, your CLI always has the concept of a "working directory", which is a [folder on your computer](https://kids.kiddle.co/File_system). The default "working directory" for a CLI app is your [home folder](https://kids.kiddle.co/Home_directory). We'll cover more info on files and folders another time.

After typing in a command, you need to **execute** it by pressing the **enter key**. The computer will then perform the command, and print out any information supplied by the command.

In this case, the output of the command will be the CLI app's "working directory". It is a [file path](https://kids.kiddle.co/Computer_file#Identifying_and_organizing), which is a little like a web address you'd type into a browser. It describes the location of a folder on your computer, along with all the other folders it is nested within.

On Windows, the output of this command might look something like this:

```bash
Path
----
C:\Users\kwhinnery
```

Remember, you want to paste in the **last line of the output only** when you are attempting to HACK the barrier. To copy the text from the PowerShell window, highlight the text with your mouse and then click the _right_ mouse button.

On a Mac, the output of the `pwd` command might look something like this:

```bash
/Users/kwhinnery
```

In this case, there's only one line of output - that's the value you'll need for the text field on the right. To copy the text from the Terminal window, highlight the text with your mouse, click the _right_ mouse button, and select "Copy" from the menu.

After you execute the `pwd` command, paste the **last line of the output** into the text field on the right and click *HACK* - TwilioQuest will validate that your path information is correct, and you can move on!
