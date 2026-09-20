package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL003WeekViewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_003",
        title = "Week View",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_002,
        onNavigate = onNavigate,
    ) {
            MFListItem("Mon","Upper Strength · 17:30","Open")
            MFListItem("Wed","Run · 18:00","Open")
            MFListItem("Sat","Lower Strength · 11:00","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL003WeekViewScreenPreview() {
    MoveFuelTheme { CAL003WeekViewScreen {} }
}
