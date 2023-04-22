# Navigating Folders from the CLI

Data inside computers is organized with the concept of "files" and "folders" - this concept is called a [file system](https://techterms.com/definition/filesystem). 

If you are student, you know that folders are a place to keep lots of different pieces of paper. Each piece of paper in your folder could be considered a "file". Inside your computer, a **file** is just a name for a piece of data that is saved on the computer. All those bits of data are organized by placing them inside **folders**, to keep related data logically close together.

It's not fancy or glamorous, but navigating through the files and folders on your computer using the CLI is a task you will do all the time as a software developer. This objective introduces a couple key commands for doing just that.

* [mkdir](https://en.wikipedia.org/wiki/Mkdir) - short for "make directory", this command creates a new folder on your computer
* [cd](https://en.wikipedia.org/wiki/Cd_(command)) - short for "change directory", this command changes the "current working directory" of your terminal app, allowing you to execute commands on files in different locations on your computer.

We will also use the [pwd](https://en.wikipedia.org/wiki/Pwd) command that you used earlier, which prints out the "current working directory".

As a software developer, you will often need to create several files that contain code (which you'll do in a moment). And you will usually want to keep your code organized in folders. That is why we are bothering to teach you all these arcane commands, since you'll frequently want to manage files and folders from the command line.

## Completing the Objective

Open up your **command line application** - `Terminal` on the Mac, or `PowerShell` on Windows. 

What you need to do is:

* Create a new folder called `quest`
* Change your working directory to that new folder
* Print out your new folder's name

Here are the commands you will need to do it. Execute each, one at a time, pressing *enter* after each command:

```bash
mkdir quest
```

```bash
cd quest
```

```bash
pwd
```

After you print out the new folder's full [path](https://techterms.com/definition/path) with the `pwd` command, paste the last line of the output into the text field on the right and click *HACK*

## I goofed and named the folder something different!

That's okay! If you have already done the `cd` command to change into the new, wrongly-named folder, you can use this command:

```bash
cd ..
```

This will change the working directory to the next folder up in the hierarchy. Once you are there, use the command `ls` to list all items in the current folder. If it's your home folder, there may be quite a few items. Your newly created folder should be there.

To change the name of your folder, use the `mv` command (short for "move") - even though you're not going to actually move the folder this time (you are renaming it), the command is the same:

```bash
mv my_wrong_folder_name quest
```
