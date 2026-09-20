package com.movefuel.mufil2.ui.screens.fpl

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FPL016DayProposalScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FPL_016",
        title = "Day Proposal",
        subtitle = "Future meal planning kept separate from consumed food.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FPL_017,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FPL_015,
        onNavigate = onNavigate,
    ) {
            MFListItem("Monday","3 planned meals","Open")
            MFListItem("Tuesday","3 planned meals","Open")
            MFListItem("Wednesday","3 planned meals","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FPL016DayProposalScreenPreview() {
    MoveFuelTheme { FPL016DayProposalScreen {} }
}
