import { Client, Collection, IntentsBitField, EmbedBuilder } from 'discord.js';
import { readFileSync, readdirSync } from 'fs';

class jayBot extends Client {
    constructor({
        token,
        commandsPath,
        eventsPath,
        buttonsPath,
        userAllowed = []
    }) {
        super({
            intents: new IntentsBitField().add(
                IntentsBitField.Flags.Guilds
            )
        })

        this.token = token;
        this.commandsPath = commandsPath;
        this.eventsPath = eventsPath;
        this.buttonsPath = buttonsPath;
        this.userIntents = new IntentsBitField()
        this.userAllowed = userAllowed

        this.commandFiles = [];
        this.eventFiles = [];
        this.eventNames = [];

        this.buttonFiles = []

        this.buttons = new Collection()
        this.commands = new Collection()
        this.events = new Collection()
    }

    #isFolder(name) {
        return !(name.includes("."))
    }

    #shouldRead(name) {
        if (name.startsWith("_")) return false

        return name.endsWith(".js") || name.endsWith(".mjs")
    }

    #readUpperDirectory(path) {
        return readdirSync(path)
    }

    useDefaultIntents() {
        this.userIntents.add(
            IntentsBitField.Flags.Guilds
        )
    }

    findCommands(path) {
        readdirSync(path || this.commandsPath).filter(async (file) => {
            if (file.startsWith('_')) return;
            if (file.endsWith(".js") || file.endsWith(".mjs")) return this.commandFiles.push(file);
            this.findCommands(this.commandsPath + `/${file}`);
        });
    }

    findButtons(path) {
        const readFiles = (path) => {
            const files = this.#readUpperDirectory(path)

            for (const file of files) {
                if (this.#isFolder(file)) {
                    readFiles(path + `/${file}`);
                    continue;
                }

                if (this.#shouldRead(file)) {
                    this.buttonFiles.push(path + `/${file}`)
                }
            }
        }

        return readFiles(path || this.buttonsPath)
    }

    async useButtons() {
        for (const file of this.buttonFiles) {
            try {
                const command = await import('../../' + file);

                const splitted = file.split("/")

                const name = splitted[splitted.length - 1].split(".")[0]

                this.buttons.set(name, command);
            } catch (err) {
                console.error(err)
            }
        }
    }

    async useCommands() {
        this.findCommands()

        for (const file of this.commandFiles) {
            let commander;

            const getCommands = (name, path = this.commandsPath) => {
                readdirSync(path).filter((find) => {
                    if (find === name) {
                        commander = `${path}/${find}`;
                    } else {
                        if (find.endsWith("js")) return;
                        if (find.startsWith("_")) return;
                        return getCommands(name, path + `/${find}`);
                    }
                });
            };
            getCommands(file);

            console.log(file)
            try {
                const command = await import('../../' + commander);

                this.commands.set(command.data.name, command);
            } catch (err) {
                console.error(err)
            }

        }
    }

    async useEvents() {
        this.eventFiles = readdirSync(this.eventsPath)
            .filter((file) => file.endsWith("js"));

        for (const file of this.eventFiles) {
            const event = await import(`../../${this.eventsPath}/${file}`);

            this.events.set(event.name, event)
            this.eventNames.push(event.name)
        }
    }

    async start() {
        this.useDefaultIntents()
        this.findButtons()

        await this.useButtons()
        await this.useCommands()
        await this.useEvents()

        this.on('interactionCreate', async interaction => {
            if (interaction.isCommand()) {
                const commands = this.userAllowed.map(e => e.name)

                if (commands.includes(interaction.commandName)) {
                    await interaction.deferReply({ ephemeral: this.userAllowed.find(e => e.name == interaction.commandName).value || false })

                    return this.commands.get(interaction.commandName)?.run(interaction, this)
                }

                if (!interaction.member.permissions.has("Administrator")) return interaction.reply({ content: `You need to be an administrator in order to execute this command`, ephemeral: true })
                return this.commands.get(interaction.commandName)?.run(interaction, this)
            }

            return this.buttons.get(interaction.customId)?.run(interaction, this)
        })

        for (const event of this.eventNames) {
            this.on(event, (data) => { this.events.get(event).execute(data, this) })
        }

        this.options.intents = this.userIntents

        try {
            await this.login(this.token)

            const pkg = await JSON.parse(Buffer.from(readFileSync('./package.json')).toString('binary', 'utf-8'))
            const top = `\x1b[34m┏╋◆ ${pkg.name.toUpperCase()} ◆╋┓\n\n\x1b[31m┏╋━━━━━━◥◣◆◢◤━━━━━━━╋┓`

            console.log('\n' + top + "\n\n\x1b[32m[!] Bot Status: ONLINE")
            console.log(`[!] Loaded ${this.commands.size} commands, ${this.events.size} events and ${this.buttons.size} buttons.`)
        } catch (err) {
            console.error("\x1b[31mBot login err: " + err);
        }
    }

}

export { jayBot }