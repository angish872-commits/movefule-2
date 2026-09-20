package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL013ConflictExplanationScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_013",
        title = "Conflict Explanation",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_014,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_012,
        onNavigate = onNavigate,
    ) {
            MFNotice("Calendar conflict","The requested time overlaps another MoveFuel event.")
            MFListItem("Existing workout","17:30–18:20","Conflict")
            MFListItem("Requested meal","18:00","Conflict")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL013ConflictExplanationScreenPreview() {
    MoveFuelTheme { CAL013ConflictExplanationScreen {} }
}
