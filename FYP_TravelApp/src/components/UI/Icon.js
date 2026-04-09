import { MaterialIcons } from "@expo/vector-icons";

const Icons = {};

const Add    = ({ size = 16, color }) => <MaterialIcons name="add"            size={size} color={color} />;
const Close  = ({ size = 16, color }) => <MaterialIcons name="close"          size={size} color={color} />;
const Delete = ({ size = 16, color }) => <MaterialIcons name="delete"         size={size} color={color} />;
const Edit   = ({ size = 16, color }) => <MaterialIcons name="edit"           size={size} color={color} />;
const Submit = ({ size = 16, color }) => <MaterialIcons name="check"          size={size} color={color} />;
const Save   = ({ size = 16, color }) => <MaterialIcons name="save"           size={size} color={color} />;
const Back   = ({ size = 16, color }) => <MaterialIcons name="arrow-back"     size={size} color={color} />;
const Search = ({ size = 16, color }) => <MaterialIcons name="search"         size={size} color={color} />;
const Info   = ({ size = 16, color }) => <MaterialIcons name="info"           size={size} color={color} />;
const Warning= ({ size = 16, color }) => <MaterialIcons name="warning"        size={size} color={color} />;
const Location=({ size = 16, color }) => <MaterialIcons name="location-on"    size={size} color={color} />;
const Calendar=({ size = 16, color }) => <MaterialIcons name="event"          size={size} color={color} />;
const Person = ({ size = 16, color }) => <MaterialIcons name="person"         size={size} color={color} />;
const Lock   = ({ size = 16, color }) => <MaterialIcons name="lock"           size={size} color={color} />;
const Email  = ({ size = 16, color }) => <MaterialIcons name="email"          size={size} color={color} />;
const Menu   = ({ size = 16, color }) => <MaterialIcons name="menu"           size={size} color={color} />;
const Home   = ({ size = 16, color }) => <MaterialIcons name="home"           size={size} color={color} />;
const Settings=({ size = 16, color }) => <MaterialIcons name="settings"       size={size} color={color} />;
const Logout = ({ size = 16, color }) => <MaterialIcons name="logout"         size={size} color={color} />;

// Compose
Icons.Add      = Add;
Icons.Close    = Close;
Icons.Delete   = Delete;
Icons.Edit     = Edit;
Icons.Submit   = Submit;
Icons.Save     = Save;
Icons.Back     = Back;
Icons.Search   = Search;
Icons.Info     = Info;
Icons.Warning  = Warning;
Icons.Location = Location;
Icons.Calendar = Calendar;
Icons.Person   = Person;
Icons.Lock     = Lock;
Icons.Email    = Email;
Icons.Menu     = Menu;
Icons.Home     = Home;
Icons.Settings = Settings;
Icons.Logout   = Logout;

export default Icons;
